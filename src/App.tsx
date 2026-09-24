import { useMemo, useState } from "react";
import "./styles.css";
import { BatchSidebar } from "./components/BatchSidebar";
import { GemForm } from "./components/GemForm";
import { GemTable } from "./components/GemTable";
import { OrderPanel } from "./components/OrderPanel";
import { SlotBoard } from "./components/SlotBoard";
import { useBatchStats, useStudio } from "./hooks/useStudio";
import { gemsOfBatch, usedShapes } from "./rules/studioRules";
import type { Gem, GemInput } from "./domain/types";

function App() {
  const store = useStudio();
  const { state, stats } = store;

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    state.batches[0]?.id ?? null
  );
  const [shapeFilter, setShapeFilter] = useState<string | null>(null);
  const [editingGem, setEditingGem] = useState<Gem | null>(null);

  const selectedBatch =
    state.batches.find((b) => b.id === selectedBatchId) ?? null;
  const batchStats = useBatchStats(state, selectedBatchId);

  const shapeOptions = useMemo(() => usedShapes(state), [state]);
  const visibleGems = useMemo(
    () => (selectedBatchId ? gemsOfBatch(state, selectedBatchId, shapeFilter) : []),
    [state, selectedBatchId, shapeFilter]
  );

  function selectBatch(id: string) {
    setSelectedBatchId(id);
    setShapeFilter(null);
    setEditingGem(null);
  }

  function handleFormSubmit(input: GemInput) {
    if (editingGem) {
      const res = store.updateGem(editingGem.id, input);
      if (res.ok) setEditingGem(null);
      return res;
    }
    if (!selectedBatchId) return { ok: false, errors: ["请先选择批次"] };
    return store.addGem(selectedBatchId, input);
  }

  return (
    <main className="app">
      <section className="hero compact">
        <p>珠宝镶嵌 · 宝石分拣批次工作台</p>
        <h1>批次镶嵌工作台</h1>
        <span>
          同一镶嵌位在未完成批次中只能占用一次，完成后自动释放；缺陷备注随宝石保留，
          订单清单只列出已分拣宝石。数据保存在本机，关闭重开可继续处理。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>进行中批次</small>
          <strong>{stats.activeBatchCount}</strong>
        </article>
        <article>
          <small>待分拣宝石</small>
          <strong>{stats.pending}</strong>
        </article>
        <article>
          <small>缺陷备注</small>
          <strong>{stats.defect}</strong>
        </article>
        <article>
          <small>总克拉</small>
          <strong>{stats.totalCarat.toFixed(2)}</strong>
        </article>
      </section>

      <section className="workspace">
        <BatchSidebar
          batches={state.batches}
          gems={state.gems}
          selectedBatchId={selectedBatchId}
          onSelect={selectBatch}
          onCreate={store.createBatch}
          onComplete={store.completeBatch}
        />

        <div className="main-col">
          {selectedBatch && (
            <div className="batch-statline">
              本批次共 {batchStats.total} 颗 · 已分拣 {batchStats.sorted} 颗 ·
              缺陷 {batchStats.defect} 条 · {batchStats.carat.toFixed(2)} ct
            </div>
          )}
          <GemForm
            state={state}
            batch={selectedBatch}
            editingGem={editingGem}
            onSubmit={handleFormSubmit}
            onCancelEdit={() => setEditingGem(null)}
          />
          <GemTable
            batch={selectedBatch}
            gems={visibleGems}
            shapeOptions={shapeOptions}
            shapeFilter={shapeFilter}
            onShapeFilter={setShapeFilter}
            onEdit={setEditingGem}
            onDelete={store.deleteGem}
            onStatus={store.setGemStatus}
            onDefect={store.setGemDefect}
          />
        </div>
      </section>

      <section className="bottom-grid">
        <SlotBoard state={state} selectedBatchId={selectedBatchId} />
        <OrderPanel state={state} />
      </section>

      <footer className="app-footer">
        <span>数据、规则与页面分层维护：data / rules / components</span>
        <button
          onClick={() => {
            if (confirm("恢复为演示数据？当前录入将被清空。")) {
              store.reset();
              setSelectedBatchId(null);
              setEditingGem(null);
            }
          }}
        >
          恢复演示数据
        </button>
      </footer>
    </main>
  );
}

export default App;
