import type { Gem } from "../types";
import type { OrderSummary } from "../rules/selectors";
import { STATUS_BADGE_CLASS } from "../data/dictionaries";

interface OrdersViewProps {
  orders: OrderSummary[];
  selectedOrderNo: string | null;
  orderGems: Gem[];
  onSelect: (orderNo: string) => void;
}

export default function OrdersView({
  orders,
  selectedOrderNo,
  orderGems,
  onSelect,
}: OrdersViewProps) {
  return (
    <section className="orders-view">
      <div className="orders-layout">
        <aside className="panel orders-list">
          <h2>订单</h2>
          <p className="muted hint">订单清单只统计【已分拣】的宝石</p>
          {orders.map((order) => (
            <button
              key={order.orderNo}
              type="button"
              className={`order-card${selectedOrderNo === order.orderNo ? " active" : ""}`}
              onClick={() => onSelect(order.orderNo)}
            >
              <strong>{order.orderNo}</strong>
              <span className="order-metrics">
                已分拣 {order.sortedCount} 颗 · {order.sortedCarat.toFixed(2)} ct
              </span>
              {(order.pendingCount > 0 || order.defectCount > 0) && (
                <span className="order-flags">
                  {order.pendingCount > 0 && <em className="flag flag-pending">待分拣 {order.pendingCount}</em>}
                  {order.defectCount > 0 && <em className="flag flag-defect">异常 {order.defectCount}</em>}
                </span>
              )}
            </button>
          ))}
        </aside>

        <div className="panel order-detail">
          {selectedOrderNo ? (
            <>
              <div className="heading">
                <div>
                  <p>订单清单</p>
                  <h2>{selectedOrderNo}</h2>
                </div>
                <div className="total-pill">
                  {orderGems.length} 颗 · 合计 {orderGems.reduce((sum, gem) => sum + gem.carat, 0).toFixed(2)} ct
                </div>
              </div>
              {orderGems.length === 0 ? (
                <div className="empty-state">
                  该订单还没有【已分拣】的宝石。待分拣或缺陷处理中的宝石不会出现在清单中。
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
                    </tr>
                  </thead>
                  <tbody>
                    {orderGems.map((gem) => (
                      <tr key={gem.id}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <div className="empty-state tall">请选择左侧订单查看已分拣宝石清单。</div>
          )}
        </div>
      </div>
    </section>
  );
}
