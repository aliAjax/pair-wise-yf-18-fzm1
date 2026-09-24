import type { Batch, Gem } from "../types";
import { STATUS_BADGE_CLASS } from "../data/dictionaries";

interface ShapeFilterProps {
  shapes: string[];
  gems: Gem[];
  active: string;
  disabled: boolean;
  onChange: (shape: string) => void;
}

/** 形状筛选条：选中批次后，按该批次实际出现过的形状筛选 */
export function ShapeFilter({ shapes, gems, active, disabled, onChange }: ShapeFilterProps) {
  const countOf = (shape: string) =>
    shape === "全部" ? gems.length : gems.filter((gem) => gem.shape === shape).length;
  const chips = ["全部", ...shapes];

  return (
    <div className="shape-filter" aria-label="按形状筛选">
      {chips.map((shape) => (
        <button
          key={shape}
          type="button"
          className={`chip${active === shape ? " active" : ""}`}
          disabled={disabled}
          onClick={() => onChange(shape)}
        >
          {shape}
          <span className="chip-count">{countOf(shape)}</span>
        </button>
      ))}
    </div>
  );
}

interface GemTableProps {
  batch: Batch;
  gems: Gem[];
  totalCount: number;
  editingId: string | null;
  onEdit: (gem: Gem) => void;
  onDelete: (gem: Gem) => void;
}

export default function GemTable({
  batch,
  gems,
  totalCount,
  editingId,
  onEdit,
  onDelete,
}: GemTableProps) {
  const readOnly = batch.status === "已完成";

  return (
    <div className="gem-table-wrap">
      <div className="table-headline">
        <h3>批次宝石清单</h3>
        <span className="muted">
          显示 {gems.length} / {totalCount} 颗
        </span>
      </div>

      {gems.length === 0 ? (
        <div className="empty-state">
          {totalCount === 0
            ? "该批次还没有宝石，在左侧录入第一颗。"
            : "当前形状筛选下没有宝石。"}
        </div>
      ) : (
        <table className="gem-table">
          <thead>
            <tr>
              <th>宝石编号</th>
              <th>形状</th>
              <th>尺寸</th>
              <th className="num">克拉</th>
              <th>净度</th>
              <th>镶嵌位</th>
              <th>状态</th>
              <th>缺陷备注</th>
              {!readOnly && <th className="ops">操作</th>}
            </tr>
          </thead>
          <tbody>
            {gems.map((gem) => (
              <tr key={gem.id} className={editingId === gem.id ? "editing" : ""}>
                <td className="gem-no">{gem.gemNo}</td>
                <td>{gem.shape}</td>
                <td>{gem.size}</td>
                <td className="num">{gem.carat.toFixed(2)}</td>
                <td>{gem.clarity}</td>
                <td>
                  <span className="seat-tag">{gem.seat}</span>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE_CLASS[gem.status]}`}>
                    {gem.status}
                  </span>
                </td>
                <td className="defect-cell">
                  {gem.defectNote ? (
                    <span className="defect-note" title={gem.defectNote}>
                      {gem.defectNote}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                {!readOnly && (
                  <td className="ops">
                    <button type="button" onClick={() => onEdit(gem)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => onDelete(gem)}
                    >
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
