// 规则层：所有业务约束集中在这里，页面与状态层只调用、不自行判断。
// 全部为纯函数，输入数据输出结果，不读写存储、不碰 DOM。

import type {
  AppData,
  Batch,
  BatchDraft,
  FieldErrors,
  Gem,
  GemDraft,
} from "../types";
import { CLARITIES, GEM_STATUSES, SHAPES } from "../data/dictionaries";

type GemField = keyof GemDraft;
type GemFieldErrors = FieldErrors<GemField>;

export function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** 解析克拉重量：允许数字，最多两位小数，必须大于 0 */
export function parseCarat(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > 100000) return null;
  return value;
}

/** 批次状态（按 id 索引，供镶嵌位冲突判断使用） */
export function batchStatusMap(data: AppData): Map<string, Batch> {
  return new Map(data.batches.map((batch) => [batch.id, batch]));
}

/**
 * 镶嵌位占用规则：
 * 同一订单的【未完成批次】中，同一镶嵌位只能被一颗宝石占用；
 * 已完成批次不再占用镶嵌位，允许与新批次复用位置。
 * 返回冲突的那颗宝石；excludeGemId 用于编辑时排除自身。
 */
export function findSeatConflict(
  data: AppData,
  orderNo: string,
  seat: string,
  excludeGemId?: string,
): Gem | undefined {
  const batchById = batchStatusMap(data);
  const key = normalize(seat).toLowerCase();
  return data.gems.find((gem) => {
    if (gem.id === excludeGemId) return false;
    if (gem.orderNo !== orderNo) return false;
    if (normalize(gem.seat).toLowerCase() !== key) return false;
    return batchById.get(gem.batchId)?.status === "未完成";
  });
}

export interface GemValidateContext {
  batch: Batch;
  /** 编辑时传入宝石 id；新增时省略 */
  gemId?: string;
}

/** 校验宝石录入/编辑表单，返回逐字段错误（空对象表示通过） */
export function validateGem(
  draft: GemDraft,
  data: AppData,
  context: GemValidateContext,
): GemFieldErrors {
  const errors: GemFieldErrors = {};

  const gemNo = normalize(draft.gemNo);
  if (!gemNo) {
    errors.gemNo = "请输入宝石编号";
  } else if (
    data.gems.some(
      (gem) =>
        gem.gemNo.toLowerCase() === gemNo.toLowerCase() &&
        gem.id !== context.gemId,
    )
  ) {
    errors.gemNo = "该宝石编号已存在";
  }

  if (!draft.shape) {
    errors.shape = "请选择形状";
  } else if (!SHAPES.includes(draft.shape as (typeof SHAPES)[number])) {
    errors.shape = "形状不在字典中";
  }

  if (!normalize(draft.size)) {
    errors.size = "请输入尺寸，如 6×4mm";
  }

  if (!draft.carat.trim()) {
    errors.carat = "请输入克拉重量";
  } else if (parseCarat(draft.carat) === null) {
    errors.carat = "需为大于 0 的数字，最多两位小数";
  }

  if (!draft.clarity) {
    errors.clarity = "请选择净度";
  } else if (!CLARITIES.includes(draft.clarity as (typeof CLARITIES)[number])) {
    errors.clarity = "净度不在字典中";
  }

  const seat = normalize(draft.seat);
  if (!seat) {
    errors.seat = "请选择或输入镶嵌位";
  } else {
    const conflict = findSeatConflict(
      data,
      context.batch.orderNo,
      seat,
      context.gemId,
    );
    if (conflict) {
      const conflictBatch = data.batches.find((b) => b.id === conflict.batchId);
      errors.seat =
        `镶嵌位「${seat}」已被 ${conflict.gemNo} 占用` +
        (conflictBatch ? `（未完成批次 ${conflictBatch.batchNo}）` : "");
    }
  }

  if (!GEM_STATUSES.includes(draft.status)) {
    errors.status = "请选择分拣状态";
  }

  // 缺陷相关状态必须填写备注；备注一旦填写即随宝石保留
  if (
    (draft.status === "缺陷待处理" || draft.status === "待复检") &&
    !normalize(draft.defectNote)
  ) {
    errors.defectNote = "该状态需要填写缺陷备注";
  }

  return errors;
}

type BatchField = keyof BatchDraft;
type BatchFieldErrors = FieldErrors<BatchField>;

/** 校验新建批次表单 */
export function validateBatch(
  draft: BatchDraft,
  data: AppData,
  excludeBatchId?: string,
): BatchFieldErrors {
  const errors: BatchFieldErrors = {};

  const batchNo = normalize(draft.batchNo);
  if (!batchNo) {
    errors.batchNo = "请输入批次编号";
  } else if (
    data.batches.some(
      (batch) =>
        batch.batchNo.toLowerCase() === batchNo.toLowerCase() &&
        batch.id !== excludeBatchId,
    )
  ) {
    errors.batchNo = "该批次编号已存在";
  }

  if (!normalize(draft.orderNo)) {
    errors.orderNo = "请输入订单号";
  }

  return errors;
}

/** 批次能否完工：至少有 1 颗宝石，且没有仍在分拣流程中的宝石 */
export function finishBlockers(data: AppData, batchId: string): string[] {
  const blockers: string[] = [];
  const gems = data.gems.filter((gem) => gem.batchId === batchId);
  if (gems.length === 0) {
    blockers.push("批次内还没有宝石，无法完工");
    return blockers;
  }
  const pending = gems.filter((gem) => gem.status !== "已分拣" && gem.status !== "已退回");
  if (pending.length > 0) {
    blockers.push(
      `还有 ${pending.length} 颗宝石未处理完（${pending
        .map((gem) => gem.gemNo)
        .join("、")}）`,
    );
  }
  return blockers;
}

/** 重新打开批次前检查：其镶嵌位是否与当前其他未完成批次冲突 */
export function reopenConflicts(data: AppData, batchId: string): Gem[] {
  const batch = data.batches.find((item) => item.id === batchId);
  if (!batch) return [];
  const conflicts: Gem[] = [];
  for (const gem of data.gems.filter((item) => item.batchId === batchId)) {
    const conflict = findSeatConflict(data, batch.orderNo, gem.seat, gem.id);
    if (conflict) conflicts.push(conflict);
  }
  return conflicts;
}
