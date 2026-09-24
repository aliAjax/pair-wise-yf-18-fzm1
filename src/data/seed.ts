import type { Gem, StudioState } from "../domain/types";

// 首次打开时的演示数据：覆盖跨批次镶嵌位冲突、缺陷备注、已分拣清单等场景
export function createSeedState(): StudioState {
  const now = Date.now();

  const batches: StudioState["batches"] = [
    { id: "b1", batchNo: "B-001", orderNo: "DD-1024", status: "进行中", createdAt: now - 3 * 86400000 },
    { id: "b2", batchNo: "B-002", orderNo: "DD-1024", status: "进行中", createdAt: now - 2 * 86400000 },
    { id: "b3", batchNo: "B-003", orderNo: "DD-1031", status: "已完成", createdAt: now - 9 * 86400000 },
  ];

  const gems: Gem[] = [
    {
      id: "g1", batchId: "b1", orderNo: "DD-1024",
      code: "ST-2048", shape: "椭圆", size: "6×4mm", carat: 0.82,
      clarity: "VS1", slot: "主石位", status: "已分拣", defectNote: "",
      createdAt: now - 3 * 86400000,
    },
    {
      id: "g2", batchId: "b1", orderNo: "DD-1024",
      code: "ST-2061", shape: "圆形", size: "1.3mm", carat: 0.08,
      clarity: "VVS2", slot: "围石A组-1", status: "已分拣", defectNote: "",
      createdAt: now - 3 * 86400000 + 1000,
    },
    {
      id: "g3", batchId: "b1", orderNo: "DD-1024",
      code: "ST-2062", shape: "圆形", size: "1.3mm", carat: 0.08,
      clarity: "SI1", slot: "围石A组-2", status: "缺陷待确认",
      defectNote: "腰棱崩口 0.2mm，需客户确认是否替换（随石保留）",
      createdAt: now - 3 * 86400000 + 2000,
    },
    {
      id: "g4", batchId: "b2", orderNo: "DD-1024",
      code: "ST-2075", shape: "梨形", size: "7×5mm", carat: 0.96,
      clarity: "VS2", slot: "吊坠位", status: "待分拣", defectNote: "",
      createdAt: now - 2 * 86400000,
    },
    // B-003 已完成：主石位已释放，但宝石与缺陷备注仍保留在订单 DD-1031 清单中
    {
      id: "g5", batchId: "b3", orderNo: "DD-1031",
      code: "ST-2099", shape: "祖母绿切", size: "7×5mm", carat: 1.52,
      clarity: "SI2", slot: "主石位", status: "已分拣",
      defectNote: "亭部内含物明显，交付前已向客户说明",
      createdAt: now - 9 * 86400000,
    },
    {
      id: "g6", batchId: "b3", orderNo: "DD-1031",
      code: "ST-2100", shape: "圆形", size: "1.5mm", carat: 0.12,
      clarity: "VS2", slot: "围石B组-1", status: "已分拣", defectNote: "",
      createdAt: now - 9 * 86400000 + 1000,
    },
  ];

  return { batches, gems, batchSeq: 3 };
}
