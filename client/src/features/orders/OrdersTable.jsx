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
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
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
          <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-[#94A3B8] italic font-sans">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order._id || order.orderId}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-medium text-[#172B4D]">
                    {order.orderId}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#172B4D] font-sans">
                    {order.instrument}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold ${
                        order.side === 'BUY' ? 'text-[#087F5B]' : 'text-[#D64545]'
                      }`}
                    >
                      {order.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {order.orderType}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#172B4D]">
                    {order.orderType === 'LIMIT'
                      ? formatINR(order.priceInPaise)
                      : 'Market'}
                  </td>
                  <td className="py-2.5 px-3 text-[#172B4D]">
                    <span className="font-semibold">{formatQuantity(order.filledQuantity)}</span>
                    <span className="text-[#94A3B8]"> / {formatQuantity(order.quantity)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {order.averageExecutionPriceInPaise > 0
                      ? formatINR(order.averageExecutionPriceInPaise)
                      : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-2.5 px-3 text-[#667085] text-[10px]">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(order._id || order.orderId)}
                        className="p-1.5 rounded-md text-[#667085] hover:text-[#172B4D] hover:bg-[#F1F5F9] transition-colors"
                        title="View order audit trail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isCancellable(order.status) && (
                        <button
                          onClick={() => handlePromptCancel(order)}
                          className="p-1.5 rounded-md text-[#D64545] hover:bg-[#FEE2E2] transition-colors"
                          title="Cancel resting order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Order Cancellation */}
      <ConfirmModal
        isOpen={!!orderToCancel}
        title="Cancel Resting Order"
        message={`Are you sure you want to cancel ${orderToCancel?.side} order ${orderToCancel?.orderId} for ${orderToCancel?.remainingQuantity} shares of ${orderToCancel?.instrument}? Any remaining reserved cash or shares will be immediately released.`}
        confirmText="Cancel Order"
        isDestructive={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setOrderToCancel(null)}
      >
        {cancelError && (
          <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}
      </ConfirmModal>

      {/* Detailed Order Timeline Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
}
