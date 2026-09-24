import { useEffect, useState } from "react";
import type { Gem, GemDraft } from "../types";
import {
  CLARITIES,
  EMPTY_GEM_DRAFT,
  GEM_STATUSES,
  SEAT_PRESETS,
  SHAPES,
} from "../data/dictionaries";

interface GemFormProps {
  /** 编辑时传入原宝石（缺陷备注默认带回填）；新增时为 null */
  editing: Gem | null;
  readOnly: boolean;
  /** 该订单下已被其他未完成批次占用的镶嵌位（已排除正在编辑的宝石自身） */
  takenSeats: Set<string>;
  errors: Partial<Record<keyof GemDraft, string>>;
  onSubmit: (draft: GemDraft) => void;
  onCancel: () => void;
}

export function gemToDraft(gem: Gem): GemDraft {
  return {
    gemNo: gem.gemNo,
    shape: gem.shape,
    size: gem.size,
    carat: String(gem.carat),
    clarity: gem.clarity,
    seat: gem.seat,
    status: gem.status,
    defectNote: gem.defectNote,
  };
}

const NOTE_REQUIRED_STATUSES = ["缺陷待处理", "待复检"];

export default function GemForm({
  editing,
  readOnly,
  takenSeats,
  errors,
  onSubmit,
  onCancel,
}: GemFormProps) {
  const [draft, setDraft] = useState<GemDraft>(
    editing ? gemToDraft(editing) : { ...EMPTY_GEM_DRAFT },
  );

  // 切换编辑目标时重置表单
  useEffect(() => {
    setDraft(editing ? gemToDraft(editing) : { ...EMPTY_GEM_DRAFT });
  }, [editing]);

  const set = <K extends keyof GemDraft>(key: K, value: GemDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const noteRequired = NOTE_REQUIRED_STATUSES.includes(draft.status);

  return (
    <form
      className="gem-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <div className="form-head">
        <h3>{editing ? `编辑宝石 ${editing.gemNo}` : "录入宝石"}</h3>
        {readOnly && <span className="lock-tip">批次已完成，表单锁定</span>}
      </div>

      <div className="form-grid">
        <label className="form-field">
          <span>宝石编号 *</span>
          <input
            value={draft.gemNo}
            disabled={readOnly}
            placeholder="如 ST-2102"
            onChange={(event) => set("gemNo", event.target.value)}
          />
          {errors.gemNo && <em className="field-error">{errors.gemNo}</em>}
        </label>

        <label className="form-field">
          <span>形状 *</span>
          <select
            value={draft.shape}
            disabled={readOnly}
            onChange={(event) => set("shape", event.target.value)}
          >
            {SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </select>
          {errors.shape && <em className="field-error">{errors.shape}</em>}
        </label>

        <label className="form-field">
          <span>尺寸 *</span>
          <input
            value={draft.size}
            disabled={readOnly}
            placeholder="如 6×4mm"
            onChange={(event) => set("size", event.target.value)}
          />
          {errors.size && <em className="field-error">{errors.size}</em>}
        </label>

        <label className="form-field">
          <span>克拉重量 *</span>
          <input
            value={draft.carat}
            disabled={readOnly}
            inputMode="decimal"
            placeholder="如 1.02"
            onChange={(event) => set("carat", event.target.value)}
          />
          {errors.carat && <em className="field-error">{errors.carat}</em>}
        </label>

        <label className="form-field">
          <span>净度 *</span>
          <select
            value={draft.clarity}
            disabled={readOnly}
            onChange={(event) => set("clarity", event.target.value)}
          >
            {CLARITIES.map((clarity) => (
              <option key={clarity} value={clarity}>
                {clarity}
              </option>
            ))}
          </select>
          {errors.clarity && <em className="field-error">{errors.clarity}</em>}
        </label>

        <label className="form-field">
          <span>镶嵌位 *</span>
          <input
            value={draft.seat}
            disabled={readOnly}
            list="seat-presets"
            placeholder="选择或输入"
            onChange={(event) => set("seat", event.target.value)}
          />
          <datalist id="seat-presets">
            {SEAT_PRESETS.map((seat) => (
              <option key={seat} value={seat} />
            ))}
          </datalist>
          {errors.seat ? (
            <em className="field-error">{errors.seat}</em>
          ) : (
            takenSeats.size > 0 && (
              <small className="seat-hint">
                已占用：{Array.from(takenSeats).join("、")}
              </small>
            )
          )}
        </label>

        <label className="form-field">
          <span>状态 *</span>
          <select
            value={draft.status}
            disabled={readOnly}
            onChange={(event) => set("status", event.target.value as GemDraft["status"])}
          >
            {GEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {errors.status && <em className="field-error">{errors.status}</em>}
        </label>

        <label className={`form-field form-field-wide${noteRequired ? " required" : ""}`}>
          <span>
            缺陷备注{noteRequired ? " *" : ""}
            <small className="note-perm">（随宝石保留，不会因完工/编辑清空）</small>
          </span>
          <textarea
            value={draft.defectNote}
            disabled={readOnly}
            rows={2}
            placeholder="如：台面可见细小内含物，镶嵌前复检"
            onChange={(event) => set("defectNote", event.target.value)}
          />
          {errors.defectNote && <em className="field-error">{errors.defectNote}</em>}
        </label>
      </div>

      {!readOnly && (
        <div className="form-actions">
          {editing && (
            <button type="button" onClick={onCancel}>
              取消编辑
            </button>
          )}
          <button type="submit" className="primary">
            {editing ? "保存修改" : "加入批次"}
          </button>
        </div>
      )}
    </form>
  );
}
