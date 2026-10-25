import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from './StatusBadge.jsx';
import { formatINR, formatDateTime, formatQuantity } from '../utils/formatters.js';
import { X, ShieldCheck, ArrowRightLeft, AlertCircle } from 'lucide-react';

export function OrderDetailModal({ orderId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDetails = async () => {
      try {
        const res = await api.orders.getEvents(orderId);
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const order = data?.order;
  const events = data?.events || [];
  const executions = data?.executions || [];

  const fillPercentage = order && order.quantity > 0
    ? Math.round((order.filledQuantity / order.quantity) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-[#172B4D] text-sm">
              Order Details & Audit Trail
            </h3>
            {order && <StatusBadge status={order.status} />}
          </div>
          <button
            onClick={onClose}
            className="text-[#667085] hover:text-[#172B4D] p-1 rounded-md hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#172B4D]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#667085]">
              <span className="w-5 h-5 border-2 border-[#087F5B] border-t-transparent rounded-full animate-spin" />
              <span>Loading order audit records...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Order Key Metrics Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                <div>
                  <span className="text-[#667085] block text-[11px]">Order Reference</span>
                  <span className="font-mono text-[#172B4D] font-medium">{order.orderId}</span>
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Instrument</span>
                  <span className="font-bold text-[#172B4D]">{order.instrument}</span>
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Side & Type</span>
                  <span
                    className={`font-semibold ${
                      order.side === 'BUY' ? 'text-[#087F5B]' : 'text-[#D64545]'
                    }`}
                  >
                    {order.side} {order.orderType}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Limit Price</span>
                  <span className="font-mono text-[#172B4D] font-medium">
                    {order.orderType === 'LIMIT' ? formatINR(order.priceInPaise) : 'Market (IOC)'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-[#667085]">
                  <span>
                    Filled:{' '}
                    <strong className="text-[#172B4D]">{formatQuantity(order.filledQuantity)}</strong> /{' '}
                    {formatQuantity(order.quantity)} shares
                  </span>
                  <span className="font-mono font-medium text-[#087F5B]">{fillPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      order.status === 'FILLED'
                        ? 'bg-[#087F5B]'
                        : order.status === 'CANCELLED'
                        ? 'bg-[#94A3B8]'
                        : 'bg-[#087F5B]'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>

              {/* Executions Section */}
              <div className="space-y-2">
                <h4 className="font-semibold text-[#172B4D] flex items-center gap-1.5 text-xs">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#087F5B]" />
                  Execution Matches ({executions.length})
                </h4>
                {executions.length === 0 ? (
                  <p className="text-[#667085] italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-[11px]">
                    No execution matches recorded for this order yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC] text-[#667085] text-[10px] uppercase font-mono border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2.5 px-3">Execution ID</th>
                          <th className="py-2.5 px-3">Price</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Notional</th>
                          <th className="py-2.5 px-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                        {executions.map((exec) => (
                          <tr key={exec.executionId || exec._id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 text-[#667085]">{exec.executionId}</td>
                            <td className="py-2.5 px-3 font-medium text-[#172B4D]">{formatINR(exec.priceInPaise)}</td>
                            <td className="py-2.5 px-3 text-[#172B4D]">{formatQuantity(exec.quantity)}</td>
                            <td className="py-2.5 px-3 text-[#087F5B] font-semibold">{formatINR(exec.notionalPaise)}</td>
                            <td className="py-2.5 px-3 text-[#667085]">{formatDateTime(exec.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Append-only Event History Timeline */}
              <div className="space-y-2">
                <h4 className="font-semibold text-[#172B4D] flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#087F5B]" />
                  Append-Only Audit Trail ({events.length})
                </h4>
                <div className="space-y-2 border-l-2 border-[#E2E8F0] ml-2 pl-3">
                  {events.map((evt, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#CBD5E1] border-2 border-white group-hover:bg-[#087F5B] transition-colors" />
                      <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-[#087F5B]">
                            {evt.eventType}
                          </span>
                          <span className="text-[#667085] font-mono text-[10px]">
                            {formatDateTime(evt.timestamp)}
                          </span>
                        </div>
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <pre className="mt-1 text-[10px] text-[#475569] overflow-x-auto bg-white p-2 rounded-lg border border-[#E2E8F0] font-mono">
                            {JSON.stringify(evt.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
