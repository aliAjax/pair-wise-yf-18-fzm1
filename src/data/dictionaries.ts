// 数据字典：下拉选项、状态流转等“可配置数据”集中在此维护。
// 调整选项无需改动规则与页面逻辑。

import type { BatchStatus, GemStatus } from "../types";

export const SHAPES = [
  "圆形",
  "椭圆",
  "梨形",
  "心形",
  "祖母绿切",
  "公主方",
  "马眼形",
  "垫形",
  "雷迪恩切",
  "三角形",
  "上丁方形",
] as const;

export const CLARITIES = [
  "FL（无瑕）",
  "IF（内无瑕）",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1（明显内含物）",
] as const;

export const GEM_STATUSES: GemStatus[] = [
  "待分拣",
  "已分拣",
  "缺陷待处理",
  "待复检",
  "已退回",
];

export const BATCH_STATUSES: BatchStatus[] = ["未完成", "已完成"];

/** 常见镶嵌位，可直接选择，也允许手工输入自定义位置 */
export const SEAT_PRESETS = [
  "主石位",
  "副石位",
  "围石A1",
  "围石A2",
  "围石A3",
  "围石B1",
  "围石B2",
  "围石B3",
] as const;

/** 状态色板（展示用，集中维护） */
export const STATUS_BADGE_CLASS: Record<GemStatus, string> = {
  待分拣: "badge-pending",
  已分拣: "badge-done",
  缺陷待处理: "badge-defect",
  待复检: "badge-review",
  已退回: "badge-return",
};

export const EMPTY_GEM_DRAFT = {
  gemNo: "",
  shape: SHAPES[0],
  size: "",
  carat: "",
  clarity: CLARITIES[3],
  seat: "",
  status: "待分拣" as GemStatus,
  defectNote: "",
};
