// 查询规则：筛选、排序、统计。页面只展示这里算好的结果，不自行写过滤条件。

import type { AppData, Batch, Gem } from "../types";

export function gemsOfBatch(data: AppData, batchId: string): Gem[] {
  return data.gems
    .filter((gem) => gem.batchId === batchId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** 工作台宝石列表：选中批次后，再按形状筛选（形状为"全部"时不筛） */
export function gemsForBench(
  data: AppData,
  batchId: string | null,
  shape: string,
): Gem[] {
  const gems = batchId ? gemsOfBatch(data, batchId) : [];
  if (shape === "全部") return gems;
  return gems.filter((gem) => gem.shape === shape);
}

/** 该批次已出现过的形状，用于生成形状筛选条 */
export function shapesInBatch(data: AppData, batchId: string): string[] {
  const shapes = gemsOfBatch(data, batchId).map((gem) => gem.shape);
  return Array.from(new Set(shapes));
}

/**
 * 批次已占用的镶嵌位（仅未完成批次占用）。
 * 返回展示用的原始名称（按忽略大小写的键去重）；
 * 互斥判断仍在 validators 中做归一化比较。
 */
export function occupiedSeats(data: AppData, orderNo: string): Set<string> {
  const unfinished = new Set(
    data.batches
      .filter((batch) => batch.orderNo === orderNo && batch.status === "未完成")
      .map((batch) => batch.id),
  );
  const byKey = new Map<string, string>();
  for (const gem of data.gems.filter((item) => unfinished.has(item.batchId))) {
    const display = gem.seat.trim();
    byKey.set(display.toLowerCase(), display);
  }
  return new Set(byKey.values());
}

export function getBatch(data: AppData, batchId: string | null): Batch | undefined {
  return data.batches.find((batch) => batch.id === batchId);
}

/** 订单清单：只显示已分拣（已完成分拣）的该订单宝石 */
export function sortedGemsOfOrder(data: AppData, orderNo: string): Gem[] {
  return data.gems
    .filter((gem) => gem.orderNo === orderNo && gem.status === "已分拣")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function allOrderNos(data: AppData): string[] {
  return Array.from(
    new Set([
      ...data.batches.map((batch) => batch.orderNo),
      ...data.gems.map((gem) => gem.orderNo),
    ]),
  ).sort();
}

export interface OrderSummary {
  orderNo: string;
  sortedCount: number;
  sortedCarat: number;
  pendingCount: number;
  defectCount: number;
}

export function orderSummaries(data: AppData): OrderSummary[] {
  return allOrderNos(data).map((orderNo) => {
    const orderGems = data.gems.filter((gem) => gem.orderNo === orderNo);
    const sorted = orderGems.filter((gem) => gem.status === "已分拣");
    return {
      orderNo,
      sortedCount: sorted.length,
      sortedCarat: sorted.reduce((sum, gem) => sum + gem.carat, 0),
      pendingCount: orderGems.filter((gem) => gem.status === "待分拣").length,
      defectCount: orderGems.filter(
        (gem) => gem.status === "缺陷待处理" || gem.status === "待复检",
      ).length,
    };
  });
}

export interface BenchStats {
  batchCount: number;
  unfinishedCount: number;
  pendingCount: number;
  defectCount: number;
}

export function benchStats(data: AppData): BenchStats {
  return {
    batchCount: data.batches.length,
    unfinishedCount: data.batches.filter((b) => b.status === "未完成").length,
    pendingCount: data.gems.filter((gem) => gem.status === "待分拣").length,
    defectCount: data.gems.filter(
      (gem) => gem.status === "缺陷待处理" || gem.status === "待复检",
    ).length,
  };
}
