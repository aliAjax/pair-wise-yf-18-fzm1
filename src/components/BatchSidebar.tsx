import { useMemo, useState } from "react";
import type { Batch, Gem } from "../domain/types";
import { isActive } from "../rules/studioRules";

interface BatchSidebarProps {
  batches: Batch[];
  gems: Gem[];
  selectedBatchId: string | null;
  onSelect: (batchId: string) => void;
  onCreate: (orderNo: string, batchNo?: string) => { ok: boolean; errors?: string[] };
  onComplete: (batchId: string) => { ok: boolean; errors?: string[] };
}

export function BatchSidebar({
  batches,
  gems,
  selectedBatchId,
  onSelect,
  onCreate,
  onComplete,
}: BatchSidebarProps) {
  const [orderNo, setOrderNo] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const countByBatch = useMemo(() => {
    const map = new Map<string, { total: number; sorted: number }>();
    for (const g of gems) {
      const cur = map.get(g.batchId) ?? { total: 0, sorted: 0 };
      cur.total += 1;
      if (g.status === "已分拣") cur.sorted += 1;
      map.set(g.batchId, cur);
    }
    return map;
  }, [gems]);

  const sorted = [...batches].sort((a, b) => b.createdAt - a.createdAt);

  function handleCreate() {
    if (!orderNo.trim()) {
      setError("请先填写订单号");
      return;
    }
    const res = onCreate(orderNo, batchNo);
    if (!res.ok) {
      setError((res.errors ?? ["创建失败"]).join("；"));
      return;
    }
    setOrderNo("");
    setBatchNo("");
    setError(null);
  }

  return (
    <aside className="panel sidebar">
      <div className="heading">
        <div>
          <p>分拣批次</p>
          <h2>批次工作台</h2>
        </div>
      </div>

      <div className="new-batch">
        <label>
          <span>订单号 *</span>
          <input
            placeholder="如 DD-1024"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
        </label>
        <label>
          <span>批次编号（留空自动）</span>
          <input
            placeholder="如 B-004"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary" onClick={handleCreate}>
          新建批次
        </button>
      </div>

      <ul className="batch-list">
        {sorted.map((b) => {
          const c = countByBatch.get(b.id) ?? { total: 0, sorted: 0 };
          const active = isActive(b);
          return (
            <li
              key={b.id}
              className={
                "batch-item" +
                (b.id === selectedBatchId ? " selected" : "") +
                (active ? "" : " done")
              }
            >
              <button className="batch-select" onClick={() => onSelect(b.id)}>
                <span className="batch-no">{b.batchNo}</span>
                <span className="batch-meta">
                  订单 {b.orderNo} · {c.sorted}/{c.total} 已分拣
                </span>
                <span className={"status-tag " + (active ? "running" : "finished")}>
                  {b.status}
                </span>
              </button>
              {active && (
                <button
                  className="complete-btn"
                  title="完成批次并释放镶嵌位"
                  onClick={() => {
                    const res = onComplete(b.id);
                    if (!res.ok) alert((res.errors ?? []).join("\n"));
                  }}
                >
                  完成
                </button>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && <li className="empty-hint">还没有批次，先新建一个</li>}
      </ul>
    </aside>
  );
}
