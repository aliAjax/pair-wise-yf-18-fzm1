import { useMemo, useState } from "react";
import type { StudioState } from "../domain/types";
import { orderNumbers, orderSortedGems } from "../rules/studioRules";

interface OrderPanelProps {
  state: StudioState;
}

/** 订单清单：只统计并展示"已分拣"的该订单宝石 */
export function OrderPanel({ state }: OrderPanelProps) {
  const orders = useMemo(() => orderNumbers(state), [state]);
  const [selected, setSelected] = useState<string | null>(null);

  const orderNo = selected ?? orders[0] ?? null;
  const gems = useMemo(
    () => (orderNo ? orderSortedGems(state, orderNo) : []),
    [state, orderNo]
  );

  const totalCarat = gems.reduce((s, g) => s + g.carat, 0);
  const defectCount = gems.filter((g) => g.defectNote).length;

  return (
    <section className="panel order-panel">
      <div className="heading">
        <div>
          <p>按订单查看</p>
          <h2>订单宝石清单（仅已分拣）</h2>
        </div>
      </div>

      <div className="chips">
        {orders.map((o) => (
          <button
            key={o}
            className={o === orderNo ? "chip-active" : ""}
            onClick={() => setSelected(o)}
          >
            {o}
          </button>
        ))}
        {orders.length === 0 && <span className="empty-hint">暂无订单</span>}
      </div>

      {orderNo && (
        <>
          <div className="order-summary">
            <span>已分拣 <b>{gems.length}</b> 颗</span>
            <span>合计 <b>{totalCarat.toFixed(2)}</b> ct</span>
            <span>缺陷备注 <b>{defectCount}</b> 条</span>
          </div>
          <ul className="order-list">
            {gems.map((g) => (
              <li key={g.id}>
                <div className="order-gem">
                  <b className="mono">{g.code}</b>
                  <span>
                    {g.shape} · {g.size} · {g.carat.toFixed(2)}ct · {g.clarity}
                  </span>
                  <span className="mono slot-tag">{g.slot}</span>
                </div>
                {g.defectNote && (
                  <div className="defect-note" title="缺陷备注随宝石保留">
                    ⚑ {g.defectNote}
                  </div>
                )}
              </li>
            ))}
            {gems.length === 0 && (
              <li className="empty-hint">
                该订单还没有已分拣宝石；待分拣 / 缺陷待确认的宝石不会出现在清单中。
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
