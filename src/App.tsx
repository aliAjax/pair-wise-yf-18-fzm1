import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Batch, Gem, GemDraft } from "./types";
import { useBench, useBenchViews } from "./state/useBench";
import GemForm from "./components/GemForm";
import GemTable, { ShapeFilter } from "./components/GemTable";
import OrdersView from "./components/OrdersView";
import BatchModal from "./components/BatchModal";

type Tab = "bench" | "orders";

export default function App() {
  const api = useBench();
  const { data } = api;

  const [tab, setTab] = useState<Tab>("bench");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    data.batches[0]?.id ?? null,
  );
  const [shapeFilter, setShapeFilter] = useState("全部");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(
    data.batches[0]?.orderNo ?? null,
  );
  const [editingGem, setEditingGem] = useState<Gem | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof GemDraft, string>>>({});
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const views = useBenchViews(api, selectedBatchId, shapeFilter, selectedOrderNo);
  const { selectedBatch } = views;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 当前批次被删除的边界（本系统不删批次，仅做兜底）
  useEffect(() => {
    if (selectedBatchId && !data.batches.some((b) => b.id === selectedBatchId)) {
      setSelectedBatchId(data.batches[0]?.id ?? null);
    }
  }, [data.batches, selectedBatchId]);

  /** 表单提示用：该订单下其他未完成批次已占用的镶嵌位，排除正在编辑的宝石 */
  const takenSeats = useMemo(() => {
    if (!selectedBatch) return new Set<string>();
    const set = new Set(views.occupied);
    if (editingGem) {
      const ownKey = editingGem.seat.trim().toLowerCase();
      for (const seat of set) {
        if (seat.toLowerCase() === ownKey) set.delete(seat);
      }
    }
    return set;
  }, [selectedBatch, views.occupied, editingGem]);

  const handleShapeChange = (shape: string) => setShapeFilter(shape);

  const handleSubmitGem = (draft: GemDraft) => {
    if (!selectedBatchId) return;
    if (editingGem) {
      const result = api.updateGem(editingGem.id, draft);
      if (!result.ok) {
        setFormErrors(result.errors ?? {});
        if (result.message) setToast({ kind: "err", text: result.message });
        return;
      }
      setEditingGem(null);
      setFormErrors({});
      setToast({ kind: "ok", text: `宝石 ${draft.gemNo} 的修改已保存，缺陷备注已保留` });
    } else {
      const result = api.addGem(selectedBatchId, draft);
      if (!result.ok) {
        setFormErrors(result.errors ?? {});
        if (result.message) setToast({ kind: "err", text: result.message });
        return;
      }
      setFormErrors({});
      // 录入后重置形状筛选，保证新宝石立即可见
      setShapeFilter("全部");
      setToast({ kind: "ok", text: `宝石 ${draft.gemNo} 已加入批次` });
      setEditingGem(null);
    }
  };

  const handleEdit = (gem: Gem) => {
    setEditingGem(gem);
    setFormErrors({});
  };

  const handleDelete = (gem: Gem) => {
    if (!window.confirm(`确定删除宝石 ${gem.gemNo} 吗？删除后释放其镶嵌位。`)) return;
    const result = api.deleteGem(gem.id);
    if (!result.ok) {
      setToast({ kind: "err", text: result.message ?? "删除失败" });
      return;
    }
    if (editingGem?.id === gem.id) setEditingGem(null);
    setToast({ kind: "ok", text: `宝石 ${gem.gemNo} 已删除，镶嵌位 ${gem.seat} 已释放` });
  };

  const handleFinish = () => {
    if (!selectedBatchId) return;
    const result = api.finishBatch(selectedBatchId);
    if (!result.ok) {
      setToast({ kind: "err", text: result.message ?? "无法完工" });
      return;
    }
    setEditingGem(null);
    setToast({
      kind: "ok",
      text: "批次已完工，其镶嵌位已释放；缺陷备注随宝石保留",
    });
  };

  const handleReopen = () => {
    if (!selectedBatchId) return;
    const result = api.reopenBatch(selectedBatchId);
    if (!result.ok) {
      setToast({ kind: "err", text: result.message ?? "无法重新打开" });
      return;
    }
    setToast({ kind: "ok", text: "批次已重新打开，可继续分拣" });
  };

  const selectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = data.batches.find((item) => item.id === batchId);
    if (batch) setSelectedOrderNo(batch.orderNo);
    setShapeFilter("全部");
    setEditingGem(null);
    setFormErrors({});
  };

  const readOnly = selectedBatch?.status === "已完成";

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <h1>珠宝镶嵌 · 批次工作台</h1>
            <p>宝石分拣 / 镶嵌位占用 / 缺陷备注随件流转</p>
          </div>
        </div>
        <nav className="tabs" aria-label="主导航">
          <button
            type="button"
            className={tab === "bench" ? "active" : ""}
            onClick={() => setTab("bench")}
          >
            批次工作台
          </button>
          <button
            type="button"
            className={tab === "orders" ? "active" : ""}
            onClick={() => setTab("orders")}
          >
            订单清单
          </button>
        </nav>
      </header>

      <section className="metrics">
        <article>
          <small>分拣批次</small>
          <strong>{views.stats.batchCount}</strong>
          <span className="metric-sub">未完成 {views.stats.unfinishedCount}</span>
        </article>
        <article>
          <small>待分拣宝石</small>
          <strong>{views.stats.pendingCount}</strong>
          <span className="metric-sub">颗，等待入位</span>
        </article>
        <article>
          <small>异常待处理</small>
          <strong>{views.stats.defectCount}</strong>
          <span className="metric-sub">缺陷/复检，备注随件保留</span>
        </article>
        <article>
          <small>已分拣宝石</small>
          <strong>{data.gems.filter((gem) => gem.status === "已分拣").length}</strong>
          <span className="metric-sub">
            {data.gems
              .filter((gem) => gem.status === "已分拣")
              .reduce((sum, gem) => sum + gem.carat, 0)
              .toFixed(2)}{" "}
            ct
          </span>
        </article>
      </section>

      {tab === "bench" ? (
        <>
          <section className="panel batch-bar">
            <div className="batch-select-group">
              <label className="batch-select">
                <span>当前批次</span>
                <select
                  value={selectedBatchId ?? ""}
                  onChange={(event) => selectBatch(event.target.value)}
                >
                  {data.batches.map((batch: Batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNo} · 订单 {batch.orderNo} · {batch.status}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary" onClick={() => setShowBatchModal(true)}>
                + 新建批次
              </button>
            </div>
            {selectedBatch && (
              <div className="batch-info">
                <span className={`status-dot ${readOnly ? "done" : "open"}`} />
                <span>
                  订单 <b>{selectedBatch.orderNo}</b>
                </span>
                <span className={`batch-pill ${readOnly ? "is-done" : "is-open"}`}>
                  {selectedBatch.status}
                </span>
                {readOnly ? (
                  <button type="button" onClick={handleReopen}>
                    重新打开
                  </button>
                ) : (
                  <button type="button" className="ghost-primary" onClick={handleFinish}>
                    完工批次
                  </button>
                )}
              </div>
            )}
          </section>

          {!selectedBatch ? (
            <section className="panel">
              <div className="empty-state tall">
                还没有任何批次，点击右上方「新建批次」开始。
              </div>
            </section>
          ) : (
            <section className="workspace">
              <aside className="panel side-form">
                <GemForm
                  editing={editingGem}
                  readOnly={readOnly}
                  takenSeats={takenSeats}
                  errors={formErrors}
                  onSubmit={handleSubmitGem}
                  onCancel={() => {
                    setEditingGem(null);
                    setFormErrors({});
                  }}
                />
              </aside>

              <section className="panel bench-main">
                <ShapeFilter
                  shapes={views.shapes}
                  gems={data.gems.filter((gem) => gem.batchId === selectedBatch.id)}
                  active={shapeFilter}
                  disabled={false}
                  onChange={handleShapeChange}
                />
                <GemTable
                  batch={selectedBatch}
                  gems={views.benchGems}
                  totalCount={
                    data.gems.filter((gem) => gem.batchId === selectedBatch.id).length
                  }
                  editingId={editingGem?.id ?? null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
                <p className="rule-note">
                  镶嵌位规则：同一订单的未完成批次中，每个镶嵌位只能被一颗宝石占用；批次完工后释放位置。
                </p>
              </section>
            </section>
          )}
        </>
      ) : (
        <OrdersView
          orders={views.orders}
          selectedOrderNo={selectedOrderNo}
          orderGems={views.orderGems}
          onSelect={setSelectedOrderNo}
        />
      )}

      <footer className="footer">
        数据保存在本机浏览器（localStorage）：规则在 src/rules、数据在 src/data、页面在 src/components，关闭重开可继续处理。
      </footer>

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}

      {showBatchModal && (
        <BatchModal
          data={data}
          onClose={() => setShowBatchModal(false)}
          onCreate={api.addBatch}
          onCreated={(batchId) => {
            setShowBatchModal(false);
            selectBatch(batchId);
            setTab("bench");
            setToast({ kind: "ok", text: "批次已创建并选中" });
          }}
        />
      )}
    </main>
  );
}
