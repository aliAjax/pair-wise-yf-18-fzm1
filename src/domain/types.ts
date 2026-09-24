// 领域模型：分拣批次 / 宝石 / 订单清单
// 数据结构变更只改这一层，规则层与页面层基于这里的类型工作

/** 宝石分拣状态 */
export type GemStatus = "待分拣" | "已分拣" | "缺陷待确认";

/** 批次处理状态：未完成时参与镶嵌位占用判定，完成后释放镶嵌位 */
export type BatchStatus = "进行中" | "已完成";

/** 宝石录入字段（不含 id，id 由数据层生成） */
export interface GemInput {
  /** 宝石编号，如 ST-2048 */
  code: string;
  shape: string;
  /** 尺寸，如 6×4mm */
  size: string;
  /** 克拉重量，如 0.82 */
  carat: number;
  clarity: string;
  /** 镶嵌位，如 主石位 / 围石A组-1 */
  slot: string;
  status: GemStatus;
  /** 缺陷备注：随宝石保留，批次完成也不清除 */
  defectNote: string;
}

export interface Gem extends GemInput {
  id: string;
  batchId: string;
  /** 所属订单号（取自所属批次，录入时冗余保存） */
  orderNo: string;
  createdAt: number;
}

export interface Batch {
  id: string;
  /** 批次编号，如 B-003 */
  batchNo: string;
  /** 订单号，如 DD-1024 */
  orderNo: string;
  status: BatchStatus;
  createdAt: number;
}

/** 整个工作室的持久化数据 */
export interface StudioState {
  batches: Batch[];
  gems: Gem[];
  /** 批次编号自增计数 */
  batchSeq: number;
}

/** 镶嵌位占用信息（规则层计算结果） */
export interface SlotOccupancy {
  slot: string;
  batchId: string;
  batchNo: string;
  gemId: string;
  gemCode: string;
  orderNo: string;
}
