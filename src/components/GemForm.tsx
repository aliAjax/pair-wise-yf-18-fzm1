import { useEffect, useState } from "react";
import { CLARITIES, GEM_STATUSES, SHAPES } from "../data/constants";
import type { Batch, Gem, GemInput, StudioState } from "../domain/types";
import { checkSlot } from "../rules/studioRules";

interface GemFormProps {
  state: StudioState;
  batch: Batch | null;
  /** 非空时为编辑模式 */
  editingGem: Gem | null;
  onSubmit: (input: GemInput) => { ok: boolean; errors?: string[] };
  onCancelEdit: () => void;
}

const EMPTY: GemInput = {
  code: "",
  shape: SHAPES[0],
  size: "",
  carat: 0,
  clarity: CLARITIES[1],
  slot: "",
  status: "待分拣",
  defectNote: "",
};

function toGemInput(gem: Gem): GemInput {
  return {
    code: gem.code,
    shape: gem.shape,
    size: gem.size,
    carat: gem.carat,
    clarity: gem.clarity,
    slot: gem.slot,
    status: gem.status,
    defectNote: gem.defectNote,
  };
}

export function GemForm({ state, batch, editingGem, onSubmit, onCancelEdit }: GemFormProps) {
  const [form, setForm] = useState<GemInput>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // 切换编辑目标时载入该宝石数据
  useEffect(() => {
    if (editingGem) {
      setForm(toGemInput(editingGem));
    }
  }, [editingGem]);

  // 切换批次/退出编辑时回到空白表单
  useEffect(() => {
    if (!editingGem) setForm(EMPTY);
  }, [batch?.id, editingGem]);

  const readOnly = batch === null;
  const batchDone = batch?.status === "已完成";

  const slotHint = (() => {
    if (!batch || !form.slot.trim()) return null;
    const check = checkSlot(state, form.slot, batch.id, editingGem?.id);
    return check.ok
      ? { tone: "ok", text: `镶嵌位「${form.slot.trim()}」可占用` }
      : { tone: "bad", text: check.reason };
  })();

  function update<K extends keyof GemInput>(key: K, value: GemInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors([]);
  }

  function handleSubmit() {
    if (readOnly) return;
    const res = onSubmit(form);
    if (!res.ok) {
      setErrors(res.errors ?? ["保存失败"]);
      setNotice(null);
      return;
    }
    setErrors([]);
    setNotice(editingGem ? "宝石信息已更新" : "宝石已录入批次");
    if (!editingGem) setForm(EMPTY);
    window.setTimeout(() => setNotice(null), 2500);
  }

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>{editingGem ? "编辑宝石" : "录入宝石"}</p>
          <h2>{editingGem ? editingGem.code : batch ? `${batch.batchNo} 新增宝石` : "请先选择批次"}</h2>
        </div>
        {editingGem && <button onClick={onCancelEdit}>退出编辑</button>}
      </div>

      {readOnly && <p className="empty-hint">在左侧选择一个批次后开始录入宝石。</p>}
      {batchDone && !editingGem && (
        <p className="warn-hint">该批次已完成，镶嵌位已释放；如需继续请新建批次。</p>
      )}

      <div className="field-grid">
        <label>
          <span>宝石编号 *</span>
          <input
            placeholder="如 ST-2101"
            value={form.code}
            disabled={readOnly}
            onChange={(e) => update("code", e.target.value)}
          />
        </label>
        <label>
          <span>形状 *</span>
          <select value={form.shape} disabled={readOnly} onChange={(e) => update("shape", e.target.value)}>
            {SHAPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>尺寸 *</span>
          <input
            placeholder="如 6×4mm"
            value={form.size}
            disabled={readOnly}
            onChange={(e) => update("size", e.target.value)}
          />
        </label>
        <label>
          <span>克拉（ct）*</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.carat || ""}
            placeholder="如 0.82"
            disabled={readOnly}
            onChange={(e) => update("carat", Number(e.target.value))}
          />
        </label>
        <label>
          <span>净度 *</span>
          <select value={form.clarity} disabled={readOnly} onChange={(e) => update("clarity", e.target.value)}>
            {CLARITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>镶嵌位 *</span>
          <input
            placeholder="如 主石位 / 围石A组-1"
            value={form.slot}
            disabled={readOnly}
            onChange={(e) => update("slot", e.target.value)}
          />
          {slotHint && <small className={"slot-hint " + slotHint.tone}>{slotHint.text}</small>}
        </label>
        <label>
          <span>状态 *</span>
          <select
            value={form.status}
            disabled={readOnly}
            onChange={(e) => update("status", e.target.value as GemInput["status"])}
          >
            {GEM_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>缺陷备注（随宝石保留）</span>
          <textarea
            rows={2}
            placeholder="如：腰棱崩口 0.2mm，需客户确认"
            value={form.defectNote}
            disabled={readOnly}
            onChange={(e) => update("defectNote", e.target.value)}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="form-error-list">
          {errors.map((e) => (
            <li key={e}>⛔ {e}</li>
          ))}
        </ul>
      )}
      {notice && <p className="ok-hint">✓ {notice}</p>}

      {!readOnly && (
        <div className="form-actions">
          <button className="primary" onClick={handleSubmit}>
            {editingGem ? "保存修改" : "录入宝石"}
          </button>
        </div>
      )}
    </section>
  );
}
