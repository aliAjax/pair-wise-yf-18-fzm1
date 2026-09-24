// 规则层冒烟测试（node 执行）：覆盖镶嵌位占用、订单清单、缺陷状态、完工/重开约束。
// 不依赖 React/DOM，直接操作规则层纯函数。
import assert from "node:assert";
import { createSeedData } from "../src/data/seed";
import type { AppData, GemDraft } from "../src/types";
import {
  findSeatConflict,
  finishBlockers,
  parseCarat,
  reopenConflicts,
  validateBatch,
  validateGem,
} from "../src/rules/validators";
import {
  gemsForBench,
  occupiedSeats,
  orderSummaries,
  shapesInBatch,
  sortedGemsOfOrder,
} from "../src/rules/selectors";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const data: AppData = createSeedData();
const b1 = data.batches.find((b) => b.batchNo === "B-2409-01")!;
const b2 = data.batches.find((b) => b.batchNo === "B-2409-02")!;
const b3 = data.batches.find((b) => b.batchNo === "B-2408-09")!;

const validDraft: GemDraft = {
  gemNo: "ST-3001",
  shape: "圆形",
  size: "1.5mm",
  carat: "0.10",
  clarity: "VS1",
  seat: "围石B2",
  status: "待分拣",
  defectNote: "",
};

// 1. 同一未完成批次内镶嵌位唯一
check("未完成批次中重复镶嵌位被拒绝", () => {
  const draft = { ...validDraft, gemNo: "ST-3002", seat: "主石位" };
  const errors = validateGem(draft, data, { batch: b2 });
  assert.match(errors.seat ?? "", /已被 ST-2048 占用/);
});

// 2. findSeatConflict 直接返回占用宝石
check("findSeatConflict 返回占用宝石且可排除自身", () => {
  const conflict = findSeatConflict(data, "DD-8801", "围石A1");
  assert.equal(conflict?.gemNo, "ST-2051");
  const self = data.gems.find((g) => g.gemNo === "ST-2051")!;
  assert.equal(findSeatConflict(data, "DD-8801", "围石A1", self.id), undefined);
});

// 3. 跨订单相同位置互不影响
check("不同订单可复用镶嵌位名称", () => {
  const draft = { ...validDraft, gemNo: "ST-3003", seat: "主石位" };
  const errors = validateGem(draft, {
    ...data,
    batches: data.batches.map((b) =>
      b.id === b2.id ? { ...b, orderNo: "DD-9999" } : b,
    ),
  }, { batch: { ...b2, orderNo: "DD-9999" } });
  assert.equal(errors.seat, undefined);
});

// 4. 已完成批次的镶嵌位已释放
check("已完成批次不再占用镶嵌位", () => {
  // b3 是 DD-8760 的已完成批次，主石位已由 ST-1990 使用
  const finishedSeat = occupiedSeats(data, "DD-8760");
  assert.equal(finishedSeat.has("主石位"), false);
  const draft = { ...validDraft, gemNo: "ST-3004", seat: "主石位" };
  const newBatch = { ...b3, id: "b-new", status: "未完成" as const };
  const errors = validateGem(draft, { ...data, batches: [...data.batches, newBatch] }, { batch: newBatch });
  assert.equal(errors.seat, undefined);
});

// 5. 空位可录入
check("未占用镶嵌位录入通过", () => {
  const errors = validateGem({ ...validDraft }, data, { batch: b2 });
  assert.deepEqual(errors, {});
});

// 6. 宝石编号唯一
check("宝石编号重复被拒绝", () => {
  const errors = validateGem({ ...validDraft, gemNo: "ST-2048", seat: "围石B3" }, data, { batch: b2 });
  assert.match(errors.gemNo ?? "", /已存在/);
});

// 7. 克拉校验
check("克拉必须为正数且最多两位小数", () => {
  assert.equal(parseCarat("1.02"), 1.02);
  assert.equal(parseCarat("0"), null);
  assert.equal(parseCarat("-1"), null);
  assert.equal(parseCarat("1.234"), null);
  assert.equal(parseCarat("abc"), null);
  const errors = validateGem({ ...validDraft, carat: "0" }, data, { batch: b2 });
  assert.ok(errors.carat);
});

// 8. 缺陷状态必须有备注
check("缺陷待处理状态必须填写缺陷备注", () => {
  const draft = { ...validDraft, seat: "围石B2", status: "缺陷待处理" as const, defectNote: "  " };
  const errors = validateGem(draft, data, { batch: b2 });
  assert.ok(errors.defectNote);
});

// 9. 已完成批次内编辑不受镶嵌位冲突限制（规则函数层面）
check("已完成批次宝石不参与镶嵌位互斥", () => {
  const g6 = data.gems.find((g) => g.gemNo === "ST-1990")!;
  const draft: GemDraft = {
    gemNo: "ST-1990",
    shape: "祖母绿切",
    size: "7×5mm",
    carat: "1.86",
    clarity: "VVS2",
    seat: "主石位",
    status: "已分拣",
    defectNote: "",
  };
  // 即便同订单再造一个“主石位”未完成宝石，已完成批次的 g6 自己编辑不会被算成冲突
  const errors = validateGem(draft, data, { batch: b3, gemId: g6.id });
  assert.deepEqual(errors, {});
});

// 10. 形状筛选
check("选中批次后按形状筛选", () => {
  const all = gemsForBench(data, b1.id, "全部");
  assert.equal(all.length, 4);
  const rounds = gemsForBench(data, b1.id, "圆形");
  assert.deepEqual(rounds.map((g) => g.gemNo).sort(), ["ST-2051", "ST-2052"]);
  assert.deepEqual(new Set(shapesInBatch(data, b1.id)), new Set(["圆形", "椭圆", "梨形"]));
});

// 11. 订单清单只含已分拣
check("订单清单只显示已分拣宝石", () => {
  const sorted = sortedGemsOfOrder(data, "DD-8801");
  assert.deepEqual(sorted.map((g) => g.gemNo), ["ST-2048", "ST-2051"]);
  // 待分拣 ST-2052、缺陷 ST-2059、待分拣 ST-2061 均不出现
  assert.ok(!sorted.some((g) => ["ST-2052", "ST-2059", "ST-2061"].includes(g.gemNo)));
});

// 12. 订单汇总
check("订单汇总统计正确", () => {
  const summaries = orderSummaries(data);
  const o1 = summaries.find((s) => s.orderNo === "DD-8801")!;
  assert.equal(o1.sortedCount, 2);
  assert.equal(o1.sortedCarat, 1.1);
  assert.equal(o1.pendingCount, 2);
  assert.equal(o1.defectCount, 1);
});

// 13. 批次编号唯一
check("批次编号重复被拒绝", () => {
  const errors = validateBatch({ batchNo: "B-2409-01", orderNo: "DD-8801" }, data);
  assert.ok(errors.batchNo);
  const ok = validateBatch({ batchNo: "B-2409-10", orderNo: "DD-8801" }, data);
  assert.deepEqual(ok, {});
});

// 14. 完工约束
check("有未处理宝石的批次不能完工", () => {
  assert.ok(finishBlockers(data, b1.id).length > 0);
  assert.deepEqual(finishBlockers(data, b3.id), []);
});

// 15. 重开冲突
check("重开批次会检测镶嵌位与现存未完成批次冲突", () => {
  // 让 b3 与 b1 同订单，且 b1 已占用主石位 → b3 重开冲突
  const mutated: AppData = {
    ...data,
    batches: data.batches.map((b) =>
      b.id === b3.id ? { ...b, orderNo: "DD-8801" } : b,
    ),
    gems: data.gems.map((g) =>
      g.batchId === b3.id ? { ...g, orderNo: "DD-8801" } : g,
    ),
  };
  const conflicts = reopenConflicts(mutated, b3.id);
  assert.ok(conflicts.some((g) => g.seat === "主石位"));
});

// 16. 大小写/空格归一化的镶嵌位
check("镶嵌位比较忽略大小写与多余空格", () => {
  const conflict = findSeatConflict(data, "DD-8801", "  主石位 ");
  assert.equal(conflict?.gemNo, "ST-2048");
});

console.log(`\n全部 ${passed} 条规则测试通过。`);
