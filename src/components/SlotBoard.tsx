import { useMemo } from "react";
import type { StudioState } from "../domain/types";
import { slotOccupancies } from "../rules/studioRules";

interface SlotBoardProps {
  state: StudioState;
  selectedBatchId: string | null;
}

/** 镶嵌位示意图：只展示未完成批次占用中的镶嵌位，完成批次自动从此图消失 */
export function SlotBoard({ state, selectedBatchId }: SlotBoardProps) {
  const occupancy = useMemo(() => {
    const list = slotOccupancies(state);
    return [...list].sort((a, b) => a.slot.localeCompare(b.slot, "zh-CN"));
  }, [state]);

  return (
    <section className="panel slot-board">
      <div className="heading">
        <div>
          <p>未完成批次占用</p>
          <h2>镶嵌位示意图</h2>
        </div>
        <span className="legend">
          <i className="dot mine" /> 本批次 <i className="dot busy" /> 其他批次
        </span>
      </div>

      {occupancy.length === 0 ? (
        <p className="empty-hint">当前没有被占用的镶嵌位。</p>
      ) : (
        <ul className="slot-grid">
          {occupancy.map((o) => {
            const mine = o.batchId === selectedBatchId;
            return (
              <li key={o.slot} className={"slot-card " + (mine ? "mine" : "busy")}>
                <span className="slot-name">{o.slot}</span>
                <span className="slot-gem">{o.gemCode}</span>
                <span className="slot-batch">
                  {o.batchNo} · {o.orderNo}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="board-note">
        同一镶嵌位在未完成批次中只能占用一次；批次完成后镶嵌位立即释放，可用于新订单。
      </p>
    </section>
  );
}
