import { useState } from "react";
import type { AppData, BatchDraft } from "../types";
import { validateBatch } from "../rules/validators";
import Modal from "./Modal";

interface BatchModalProps {
  data: AppData;
  onClose: () => void;
  onCreate: (draft: BatchDraft) => { ok: boolean; batchId?: string; errors?: Partial<Record<keyof BatchDraft, string>> };
  onCreated: (batchId: string) => void;
}

const EMPTY: BatchDraft = { batchNo: "", orderNo: "" };

export default function BatchModal({ data, onClose, onCreate, onCreated }: BatchModalProps) {
  const [draft, setDraft] = useState<BatchDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof BatchDraft, string>>>({});

  const orderNos = Array.from(new Set(data.batches.map((batch) => batch.orderNo))).sort();

  const submit = () => {
    const nextErrors = validateBatch(draft, data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const result = onCreate(draft);
    if (result.ok && result.batchId) {
      onCreated(result.batchId);
    } else if (result.errors) {
      setErrors(result.errors);
    }
  };

  return (
    <Modal title="新建分拣批次" onClose={onClose}>
      <div className="form-stack">
        <label className="form-field">
          <span>批次编号 *</span>
          <input
            value={draft.batchNo}
            placeholder="如 B-2409-03"
            onChange={(event) => setDraft({ ...draft, batchNo: event.target.value })}
          />
          {errors.batchNo && <em className="field-error">{errors.batchNo}</em>}
        </label>
        <label className="form-field">
          <span>订单号 *</span>
          <input
            value={draft.orderNo}
            list="order-no-list"
            placeholder="如 DD-8801"
            onChange={(event) => setDraft({ ...draft, orderNo: event.target.value })}
          />
          <datalist id="order-no-list">
            {orderNos.map((orderNo) => (
              <option key={orderNo} value={orderNo} />
            ))}
          </datalist>
          {errors.orderNo && <em className="field-error">{errors.orderNo}</em>}
        </label>
      </div>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button type="button" className="primary" onClick={submit}>
          创建并选中
        </button>
      </div>
    </Modal>
  );
}
