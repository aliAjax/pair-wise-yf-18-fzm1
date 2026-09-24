// 领域模型：批次与宝石
// 数据结构集中维护，页面与规则只依赖这里的类型定义。

export type BatchStatus = "未完成" | "已完成";

export type GemStatus =
  | "待分拣"
  | "已分拣"
  | "缺陷待处理"
  | "待复检"
  | "已退回";

export interface Batch {
  id: string;
  /** 批次编号，如 B-2409-01 */
  batchNo: string;
  /** 该批次服务的订单号 */
  orderNo: string;
  status: BatchStatus;
  createdAt: number;
  finishedAt?: number;
}

export interface Gem {
  id: string;
  /** 宝石编号，全局唯一 */
  gemNo: string;
  /** 所属订单号（取自批次，冗余存储便于按订单查询） */
  orderNo: string;
  batchId: string;
  /** 形状 */
  shape: string;
  /** 尺寸，如 6×4mm */
  size: string;
  /** 克拉重量 */
  carat: number;
  /** 净度等级 */
  clarity: string;
  /** 镶嵌位，如 主石位 / 围石A1 */
  seat: string;
  status: GemStatus;
  /** 缺陷备注：随宝石保留，编辑其他字段或批次完工均不清空 */
  defectNote: string;
  createdAt: number;
}

export interface AppData {
  version: 1;
  batches: Batch[];
  gems: Gem[];
}

/** 表单草稿：克拉在输入阶段为字符串，提交时由规则层解析校验 */
export interface GemDraft {
  gemNo: string;
  shape: string;
  size: string;
  carat: string;
  clarity: string;
  seat: string;
  status: GemStatus;
  defectNote: string;
}

export interface BatchDraft {
  batchNo: string;
  orderNo: string;
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export interface Result<T = unknown> {
  ok: boolean;
  errors?: T;
  message?: string;
}
