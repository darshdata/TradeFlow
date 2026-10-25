import React, { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import { OrderDetailModal } from '../../components/OrderDetailModal.jsx';
import {
  formatINR,
  formatDateTime,
  formatQuantity,
} from '../../utils/formatters.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrading } from '../../context/TradingContext.jsx';
import { Ban, Eye, AlertCircle } from 'lucide-react';

export function OrdersTable({ orders = [], onOrderUpdated }) {
  const { refreshAccount } = useAuth();
  const { refreshAll } = useTrading();

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const handleOpenDetail = (orderId) => {
    setSelectedOrderId(orderId);
    setDetailModalOpen(true);
  };

  const handlePromptCancel = (order) => {
    setOrderToCancel(order);
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      await api.orders.cancel(orderToCancel._id || orderToCancel.id);
      setOrderToCancel(null);
      refreshAccount();
      refreshAll();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancellable = (status) => ['NEW', 'OPEN', 'PARTIALLY_FILLED'].includes(status);

  return (
    <div className="space-y-3">
      {/* Table container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111622] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-3.5">Order Ref</th>
              <th className="py-3 px-3">Instrument</th>
              <th className="py-3 px-3">Side</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Limit Price</th>
              <th className="py-3 px-3">Filled / Qty</th>
              <th className="py-3 px-3">Avg Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 italic">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order._id || order.orderId}
                  className="hover:bg-slate-850/40 transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-medium text-slate-300">
                    {order.orderId}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-100 font-sans">
                    {order.instrument}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold ${
                        order.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {order.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">
                    {order.orderType}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {order.orderType === 'LIMIT' ? formatINR(order.priceInPaise) : 'Market'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="font-semibold text-slate-100">
                      {formatQuantity(order.filledQuantity)}
                    </span>
                    <span className="text-slate-500"> / {formatQuantity(order.quantity)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {order.averageExecutionPriceInPaise > 0
                      ? formatINR(order.averageExecutionPriceInPaise)
                      : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right space-x-1.5 font-sans">
                    <button
                      onClick={() => handleOpenDetail(order._id || order.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors"
                      title="Inspect events & executions"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {isCancellable(order.status) && (
                      <button
                        onClick={() => handlePromptCancel(order)}
                        className="p-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Cancel remaining order"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cancellation Modal */}
      <ConfirmModal
        isOpen={!!orderToCancel}
        title="Cancel Order Confirmation"
        confirmText="Cancel Order"
        isDestructive={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setOrderToCancel(null);
          setCancelError(null);
        }}
      >
        <div className="space-y-2">
          <p className="text-slate-300">
            Are you sure you want to cancel open order{' '}
            <strong className="text-slate-100 font-mono">{orderToCancel?.orderId}</strong>?
          </p>
          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Instrument:</span>
              <span className="text-slate-200">{orderToCancel?.instrument}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Remaining Quantity:</span>
              <span className="text-slate-200">
                {formatQuantity(orderToCancel?.remainingQuantity || 0)} shares
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reservation to release:</span>
              <span className="text-emerald-400 font-medium">
                {orderToCancel?.side === 'BUY'
                  ? formatINR(orderToCancel?.priceInPaise * orderToCancel?.remainingQuantity)
                  : `${orderToCancel?.remainingQuantity} shares`}
              </span>
            </div>
          </div>
          {cancelError && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}
        </div>
      </ConfirmModal>

      {/* Audit Detail Modal */}
      <OrderDetailModal
        isOpen={detailModalOpen}
        orderId={selectedOrderId}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
