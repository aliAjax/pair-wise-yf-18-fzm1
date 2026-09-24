import type { BatchStatus, GemStatus } from "../domain/types";

// 下拉选项与显示常量集中维护，新增选项只改这里
export const SHAPES = ["圆形", "椭圆", "梨形", "祖母绿切", "心形", "马眼形"] as const;

export const CLARITIES = [
  "FL 无瑕",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1 内含物",
] as const;

export const GEM_STATUSES: GemStatus[] = ["待分拣", "已分拣", "缺陷待确认"];

export const BATCH_STATUSES: BatchStatus[] = ["进行中", "已完成"];

/** localStorage 存储键 */
export const STORAGE_KEY = "jewelry-inlay-studio:v1";
