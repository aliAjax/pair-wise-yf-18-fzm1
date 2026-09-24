// 状态层：持有内存数据、自动持久化，并把规则层的校验结果落到具体操作上。
// 组件只调用这里暴露的动作，不直接修改数据，也不自己判断业务约束。

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppData,
  Batch,
  BatchDraft,
  Gem,
  GemDraft,
  Result,
} from "../types";
import { loadData, saveData } from "../data/storage";
import {
  finishBlockers,
  reopenConflicts,
  validateBatch,
  validateGem,
} from "../rules/validators";
import {
  benchStats,
  gemsForBench,
  getBatch,
  occupiedSeats,
  orderSummaries,
  shapesInBatch,
  sortedGemsOfOrder,
} from "../rules/selectors";

type GemErrors = Partial<Record<keyof GemDraft, string>>;
type BatchErrors = Partial<Record<keyof BatchDraft, string>>;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function useBench() {
  const [data, setData] = useState<AppData>(() => loadData());

  // 任何改动立即写入本地存档，关闭后重开可继续处理
  useEffect(() => {
    saveData(data);
  }, [data]);

  const addBatch = useCallback(
    (draft: BatchDraft): Result<BatchErrors> & { batchId?: string } => {
      const errors = validateBatch(draft, data);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const batch: Batch = {
        id: makeId("b"),
        batchNo: normalize(draft.batchNo),
        orderNo: normalize(draft.orderNo),
        status: "未完成",
        createdAt: Date.now(),
      };
      setData((prev) => ({ ...prev, batches: [...prev.batches, batch] }));
      return { ok: true, batchId: batch.id };
    },
    [data],
  );

  const addGem = useCallback(
    (batchId: string, draft: GemDraft): Result<GemErrors> & { gemId?: string } => {
      const batch = data.batches.find((item) => item.id === batchId);
      if (!batch) return { ok: false, message: "批次不存在" };
      if (batch.status === "已完成")
        return { ok: false, message: "批次已完成，如需继续录入请先重新打开" };

      const errors = validateGem(draft, data, { batch });
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const gem: Gem = {
        id: makeId("g"),
        gemNo: normalize(draft.gemNo),
        orderNo: batch.orderNo,
        batchId,
        shape: draft.shape,
        size: normalize(draft.size),
        carat: Number(draft.carat),
        clarity: draft.clarity,
        seat: normalize(draft.seat),
        status: draft.status,
        defectNote: draft.defectNote.trim(),
        createdAt: Date.now(),
      };
      setData((prev) => ({ ...prev, gems: [...prev.gems, gem] }));
      return { ok: true, gemId: gem.id };
    },
    [data],
  );

  /** 编辑宝石：采用补丁式合并，缺陷备注等未提交字段原样保留 */
  const updateGem = useCallback(
    (gemId: string, draft: GemDraft): Result<GemErrors> => {
      const existing = data.gems.find((item) => item.id === gemId);
      if (!existing) return { ok: false, message: "宝石不存在" };
      const batch = data.batches.find((item) => item.id === existing.batchId);
      if (!batch) return { ok: false, message: "批次不存在" };
      if (batch.status === "已完成")
        return { ok: false, message: "批次已完成，请先重新打开后再修改" };

      const errors = validateGem(draft, data, { batch, gemId });
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      setData((prev) => ({
        ...prev,
        gems: prev.gems.map((gem) =>
          gem.id === gemId
            ? {
                ...gem,
                gemNo: normalize(draft.gemNo),
                shape: draft.shape,
                size: normalize(draft.size),
                carat: Number(draft.carat),
                clarity: draft.clarity,
                seat: normalize(draft.seat),
                status: draft.status,
                defectNote: draft.defectNote.trim(),
              }
            : gem,
        ),
      }));
      return { ok: true };
    },
    [data],
  );

  const deleteGem = useCallback(
    (gemId: string): Result => {
      const existing = data.gems.find((item) => item.id === gemId);
      if (!existing) return { ok: false, message: "宝石不存在" };
      const batch = data.batches.find((item) => item.id === existing.batchId);
      if (batch?.status === "已完成")
        return { ok: false, message: "批次已完成，不能删除宝石" };

      setData((prev) => ({
        ...prev,
        gems: prev.gems.filter((gem) => gem.id !== gemId),
      }));
      return { ok: true };
    },
    [data],
  );

  const finishBatch = useCallback(
    (batchId: string): Result => {
      const blockers = finishBlockers(data, batchId);
      if (blockers.length > 0) return { ok: false, message: blockers[0] };
      setData((prev) => ({
        ...prev,
        batches: prev.batches.map((batch) =>
          batch.id === batchId
            ? { ...batch, status: "已完成", finishedAt: Date.now() }
            : batch,
        ),
      }));
      return { ok: true };
    },
    [data],
  );

  const reopenBatch = useCallback(
    (batchId: string): Result & { conflicts?: Gem[] } => {
      const conflicts = reopenConflicts(data, batchId);
      if (conflicts.length > 0) {
        return {
          ok: false,
          message:
            "批次内镶嵌位与其他未完成批次冲突：" +
            conflicts.map((gem) => `${gem.seat}（${gem.gemNo}）`).join("、"),
          conflicts,
        };
      }
      setData((prev) => ({
        ...prev,
        batches: prev.batches.map((batch) =>
          batch.id === batchId
            ? { ...batch, status: "未完成", finishedAt: undefined }
            : batch,
        ),
      }));
      return { ok: true };
    },
    [data],
  );

  return {
    data,
    addBatch,
    addGem,
    updateGem,
    deleteGem,
    finishBatch,
    reopenBatch,
  };
}

export type BenchApi = ReturnType<typeof useBench>;

/** 派生数据钩子：把规则层的纯查询绑定到当前数据上 */
export function useBenchViews(api: BenchApi, selectedBatchId: string | null, shapeFilter: string, selectedOrderNo: string | null) {
  const { data } = api;

  return useMemo(() => {
    const selectedBatch = getBatch(data, selectedBatchId) ?? null;
    return {
      selectedBatch,
      benchGems: gemsForBench(data, selectedBatchId, shapeFilter),
      shapes: selectedBatchId ? shapesInBatch(data, selectedBatchId) : [],
      occupied: selectedBatch
        ? occupiedSeats(data, selectedBatch.orderNo)
        : new Set<string>(),
      orders: orderSummaries(data),
      orderGems: selectedOrderNo
        ? sortedGemsOfOrder(data, selectedOrderNo)
        : [],
      stats: benchStats(data),
    };
  }, [data, selectedBatchId, shapeFilter, selectedOrderNo]);
}
