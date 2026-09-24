import type {
  Batch,
  Gem,
  GemInput,
  SlotOccupancy,
  StudioState,
} from "../domain/types";

// 业务规则层：纯函数，不碰 React / localStorage。
// 规则变更（镶嵌位判定、清单口径、必填项）只改这一层。

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** 只有"进行中"的批次占用镶嵌位；已完成批次释放镶嵌位 */
export function isActive(batch: Batch): boolean {
  return batch.status === "进行中";
}

/**
 * 当前镶嵌位占用表：未完成批次中，每个镶嵌位只允许被一颗宝石占用。
 * 已完成批次中的宝石不再占位（可交付给下一单），但数据仍保留。
 */
export function slotOccupancies(state: StudioState): SlotOccupancy[] {
  const activeBatches = new Map(
    state.batches.filter(isActive).map((b) => [b.id, b])
  );
  return state.gems
    .filter((g) => activeBatches.has(g.batchId))
    .map((g) => {
      const batch = activeBatches.get(g.batchId)!;
      return {
        slot: g.slot.trim(),
        batchId: batch.id,
        batchNo: batch.batchNo,
        gemId: g.id,
        gemCode: g.code,
        orderNo: g.orderNo,
      };
    });
}

/** 镶嵌位 -> 占用信息 的索引 */
export function slotOccupancyMap(
  state: StudioState
): Map<string, SlotOccupancy> {
  return new Map(slotOccupancies(state).map((o) => [o.slot, o]));
}

export type SlotCheck =
  | { ok: true }
  | { ok: false; reason: string; occupancy: SlotOccupancy };

/**
 * 校验镶嵌位能否被某批次使用。
 * @param state 当前全量数据
 * @param slot 镶嵌位
 * @param batchId 申请占用的批次
 * @param ignoreGemId 编辑宝石时排除自身
 */
export function checkSlot(
  state: StudioState,
  slot: string,
  batchId: string,
  ignoreGemId?: string
): SlotCheck {
  const normalized = slot.trim();
  const occupied = slotOccupancyMap(state).get(normalized);
  if (!occupied) return { ok: true };
  if (occupied.gemId === ignoreGemId) return { ok: true };
  // 同一批次内重复占用同样拒绝（规则口径：未完成批次里同一镶嵌位只能占一次）
  if (occupied.batchId === batchId) {
    return {
      ok: false,
      reason: `镶嵌位「${normalized}」已被本批次宝石 ${occupied.gemCode} 占用`,
      occupancy: occupied,
    };
  }
  return {
    ok: false,
    reason: `镶嵌位「${normalized}」正被批次 ${occupied.batchNo}（订单 ${occupied.orderNo}）的 ${occupied.gemCode} 占用，待该批次完成后释放`,
    occupancy: occupied,
  };
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/** 宝石录入校验：必填字段 + 数值合法性 + 镶嵌位唯一规则 */
export function validateGem(
  state: StudioState,
  batch: Batch,
  input: GemInput,
  ignoreGemId?: string
): ValidationResult {
  const errors: string[] = [];
  if (!input.code.trim()) errors.push("宝石编号不能为空");
  if (!input.shape.trim()) errors.push("形状不能为空");
  if (!input.size.trim()) errors.push("尺寸不能为空");
  if (!(input.carat > 0) || Number.isNaN(input.carat))
    errors.push("克拉重量必须为大于 0 的数字");
  if (!input.clarity.trim()) errors.push("净度不能为空");
  if (!input.slot.trim()) errors.push("镶嵌位不能为空");

  if (input.code.trim() && state.gems.some((g) => g.code === input.code.trim() && g.id !== ignoreGemId)) {
    errors.push(`宝石编号 ${input.code.trim()} 已存在`);
  }

  if (input.slot.trim()) {
    const slotCheck = checkSlot(state, input.slot, batch.id, ignoreGemId);
    if (!slotCheck.ok) errors.push(slotCheck.reason);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** 批次完成时：镶嵌位随之释放（由批次状态驱动，无需逐颗处理） */
export function canCompleteBatch(batch: Batch): { ok: true } | { ok: false; reason: string } {
  if (batch.status === "已完成")
    return { ok: false, reason: "该批次已完成" };
  return { ok: true };
}

/**
 * 订单清单：只显示已分拣的该订单宝石。
 * 待分拣、缺陷待确认不出现在订单清单中；缺陷备注随宝石保留并随清单展示。
 */
export function orderSortedGems(state: StudioState, orderNo: string): Gem[] {
  return state.gems
    .filter((g) => g.orderNo === orderNo && g.status === "已分拣")
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** 某批次的宝石，可再按形状筛选 */
export function gemsOfBatch(
  state: StudioState,
  batchId: string,
  shapeFilter: string | null
): Gem[] {
  return state.gems
    .filter((g) => g.batchId === batchId)
    .filter((g) => (shapeFilter ? g.shape === shapeFilter : true))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** 数据中出现过的全部形状（用于筛选按钮，包含常量里尚未列出的录入值） */
export function usedShapes(state: StudioState): string[] {
  return Array.from(new Set(state.gems.map((g) => g.shape))).sort();
}

/** 所有订单号（按批次创建顺序） */
export function orderNumbers(state: StudioState): string[] {
  return Array.from(new Set(state.batches.map((b) => b.orderNo)));
}

/** 批次统计 */
export function batchStats(state: StudioState, batchId: Batch["id"]) {
  const gems = state.gems.filter((g) => g.batchId === batchId);
  const sorted = gems.filter((g) => g.status === "已分拣").length;
  const defect = gems.filter((g) => g.defectNote.trim().length > 0).length;
  const carat = gems.reduce((sum, g) => sum + (g.carat || 0), 0);
  return { total: gems.length, sorted, defect, carat };
}
