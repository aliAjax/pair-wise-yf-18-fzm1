import { useState } from "react";
import { GEM_STATUSES } from "../data/constants";
import type { Batch, Gem } from "../domain/types";

interface GemTableProps {
  batch: Batch | null;
  /** 已按形状筛选后的宝石 */
  gems: Gem[];
  /** 全部可选形状 */
  shapeOptions: string[];
  shapeFilter: string | null;
  onShapeFilter: (shape: string | null) => void;
  onEdit: (gem: Gem) => void;
  onDelete: (gemId: string) => void;
  onStatus: (gemId: string, status: Gem["status"]) => void;
  onDefect: (gemId: string, note: string) => void;
}

export function GemTable({
  batch,
  gems,
  shapeOptions,
  shapeFilter,
  onShapeFilter,
  onEdit,
  onDelete,
  onStatus,
  onDefect,
}: GemTableProps) {
  const [defectEditingId, setDefectEditingId] = useState<string | null>(null);
  const [defectDraft, setDefectDraft] = useState("");

  function startDefect(g: Gem) {
    setDefectEditingId(g.id);
    setDefectDraft(g.defectNote);
  }

  function saveDefect(gemId: string) {
    onDefect(gemId, defectDraft.trim());
    setDefectEditingId(null);
  }

  if (!batch) {
    return (
      <section className="panel">
        <div className="heading"><div><p>批次宝石</p><h2>未选择批次</h2></div></div>
        <p className="empty-hint">选择左侧批次后，这里显示该批次宝石并可按形状筛选。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>批次 {batch.batchNo} · 订单 {batch.orderNo}</p>
          <h2>宝石明细（按形状筛选）</h2>
        </div>
        <span className={"status-tag " + (batch.status === "进行中" ? "running" : "finished")}>
          {batch.status}
        </span>
      </div>

      <div className="chips filter-chips">
        <button
          className={shapeFilter === null ? "chip-active" : ""}
          onClick={() => onShapeFilter(null)}
        >
          全部
        </button>
        {shapeOptions.map((s) => (
          <button
            key={s}
            className={shapeFilter === s ? "chip-active" : ""}
            onClick={() => onShapeFilter(shapeFilter === s ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="gem-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>形状</th>
              <th>尺寸</th>
              <th>克拉</th>
              <th>净度</th>
              <th>镶嵌位</th>
              <th>状态</th>
              <th>缺陷备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {gems.map((g) => (
              <tr key={g.id} className={g.defectNote ? "has-defect" : ""}>
                <td className="mono">{g.code}</td>
                <td>{g.shape}</td>
                <td>{g.size}</td>
                <td>{g.carat.toFixed(2)}</td>
                <td>{g.clarity}</td>
                <td className="mono">{g.slot}</td>
                <td>
                  <select
                    value={g.status}
                    onChange={(e) => onStatus(g.id, e.target.value as Gem["status"])}
                  >
                    {GEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="defect-cell">
                  {defectEditingId === g.id ? (
                    <span className="defect-edit">
                      <input
                        autoFocus
                        value={defectDraft}
                        onChange={(e) => setDefectDraft(e.target.value)}
                        placeholder="缺陷说明，随石保留"
                      />
                      <button onClick={() => saveDefect(g.id)}>存</button>
                    </span>
                  ) : g.defectNote ? (
                    <button className="defect-pill" title="点击修改" onClick={() => startDefect(g)}>
                      {g.defectNote}
                    </button>
                  ) : (
                    <button className="defect-add" onClick={() => startDefect(g)}>
                      + 备注
                    </button>
                  )}
                </td>
                <td className="row-actions">
                  <button onClick={() => onEdit(g)}>编辑</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm(`删除宝石 ${g.code}？此操作不可撤销。`)) onDelete(g.id);
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {gems.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-hint">
                  {shapeFilter ? `没有形状为「${shapeFilter}」的宝石` : "该批次暂无宝石"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
