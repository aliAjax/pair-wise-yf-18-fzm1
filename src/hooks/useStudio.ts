import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Batch, Gem, GemInput, StudioState } from "../domain/types";
import { loadState, resetState, saveState } from "../data/storage";
import {
  batchStats,
  isActive,
  nextId,
  validateGem,
} from "../rules/studioRules";

// 应用状态胶水层：页面组件只调用这里的动作，规则判定全部委托 rules 层。
export interface ActionResult {
  ok: boolean;
  errors?: string[];
}

function normalizeInput(input: GemInput): GemInput {
  return {
    code: input.code.trim(),
    shape: input.shape.trim(),
    size: input.size.trim(),
    carat: Number(input.carat),
    clarity: input.clarity.trim(),
    slot: input.slot.trim(),
    status: input.status,
    defectNote: input.defectNote.trim(),
  };
}

export function useStudio() {
  const [state, setState] = useState<StudioState>(() => loadState());
  // 同步读取最新数据，保证动作函数能在校验后立即返回结果（不依赖 setState updater 时机）
  const ref = useRef(state);
  ref.current = state;

  // 每次变更即持久化，关闭重开可接着处理
  useEffect(() => {
    saveState(state);
  }, [state]);

  const createBatch = useCallback(
    (orderNo: string, batchNo?: string): ActionResult & { batch?: Batch } => {
      const prev = ref.current;
      const order = orderNo.trim();
      if (!order) return { ok: false, errors: ["订单号不能为空"] };

      const no = batchNo?.trim() || `B-${String(prev.batchSeq + 1).padStart(3, "0")}`;
      if (prev.batches.some((b) => b.batchNo === no)) {
        return { ok: false, errors: [`批次编号 ${no} 已存在`] };
      }
      const batch: Batch = {
        id: nextId("b"),
        batchNo: no,
        orderNo: order,
        status: "进行中",
        createdAt: Date.now(),
      };
      setState({
        ...prev,
        batches: [...prev.batches, batch],
        batchSeq: prev.batchSeq + 1,
      });
      return { ok: true, batch };
    },
    []
  );

  const completeBatch = useCallback((batchId: string): ActionResult => {
    const prev = ref.current;
    const batch = prev.batches.find((b) => b.id === batchId);
    if (!batch) return { ok: false, errors: ["批次不存在"] };
    if (batch.status === "已完成") return { ok: false, errors: ["该批次已完成"] };
    setState({
      ...prev,
      batches: prev.batches.map((b) =>
        b.id === batchId ? { ...b, status: "已完成" as const } : b
      ),
    });
    return { ok: true };
  }, []);

  const addGem = useCallback((batchId: string, input: GemInput): ActionResult => {
    const prev = ref.current;
    const batch = prev.batches.find((b) => b.id === batchId);
    if (!batch) return { ok: false, errors: ["请先选择批次"] };

    const validation = validateGem(prev, batch, input);
    if (!validation.ok) return validation;

    const gem: Gem = {
      ...normalizeInput(input),
      id: nextId("g"),
      batchId,
      orderNo: batch.orderNo,
      createdAt: Date.now(),
    };
    setState({ ...prev, gems: [...prev.gems, gem] });
    return { ok: true };
  }, []);

  const updateGem = useCallback((gemId: string, input: GemInput): ActionResult => {
    const prev = ref.current;
    const gem = prev.gems.find((g) => g.id === gemId);
    if (!gem) return { ok: false, errors: ["宝石记录不存在"] };
    const batch = prev.batches.find((b) => b.id === gem.batchId);
    if (!batch) return { ok: false, errors: ["所属批次不存在"] };

    const validation = validateGem(prev, batch, input, gemId);
    if (!validation.ok) return validation;

    setState({
      ...prev,
      gems: prev.gems.map((g) =>
        g.id === gemId ? { ...g, ...normalizeInput(input) } : g
      ),
    });
    return { ok: true };
  }, []);

  const setGemStatus = useCallback((gemId: string, status: GemInput["status"]) => {
    const prev = ref.current;
    setState({
      ...prev,
      gems: prev.gems.map((g) => (g.id === gemId ? { ...g, status } : g)),
    });
  }, []);

  const setGemDefect = useCallback((gemId: string, note: string) => {
    // 缺陷备注随宝石保留：独立更新入口，任何批次状态下都可补充且不会被清空
    const prev = ref.current;
    setState({
      ...prev,
      gems: prev.gems.map((g) => (g.id === gemId ? { ...g, defectNote: note } : g)),
    });
  }, []);

  const deleteGem = useCallback((gemId: string) => {
    const prev = ref.current;
    setState({ ...prev, gems: prev.gems.filter((g) => g.id !== gemId) });
  }, []);

  const reset = useCallback(() => setState(resetState()), []);

  const stats = useMemo(() => {
    const activeBatchCount = state.batches.filter(isActive).length;
    const pending = state.gems.filter((g) => g.status === "待分拣").length;
    const defect = state.gems.filter((g) => g.defectNote.trim().length > 0).length;
    const totalCarat = state.gems.reduce((s, g) => s + (g.carat || 0), 0);
    return {
      activeBatchCount,
      pending,
      defect,
      totalCarat,
      batchCount: state.batches.length,
    };
  }, [state]);

  return {
    state,
    stats,
    createBatch,
    completeBatch,
    addGem,
    updateGem,
    setGemStatus,
    setGemDefect,
    deleteGem,
    reset,
  };
}

export type StudioStore = ReturnType<typeof useStudio>;

export function useBatchStats(state: StudioState, batchId: string | null) {
  return useMemo(
    () =>
      batchId
        ? batchStats(state, batchId)
        : { total: 0, sorted: 0, defect: 0, carat: 0 },
    [state, batchId]
  );
}
