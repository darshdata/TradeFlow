import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from './StatusBadge.jsx';
import { formatINR, formatDateTime, formatQuantity } from '../utils/formatters.js';
import { X, Clock, CheckCircle2, ShieldCheck, ArrowRightLeft, AlertCircle } from 'lucide-react';

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

  const fillPercentage = order
    ? Math.round((order.filledQuantity / order.quantity) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#121826] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-100 text-sm">
              Order Details & Audit Trail
            </h3>
            {order && <StatusBadge status={order.status} />}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading order audit records...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Order Key Metrics Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">Order Reference</span>
                  <span className="font-mono text-slate-200 font-medium">{order.orderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Instrument</span>
                  <span className="font-bold text-slate-100">{order.instrument}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Side & Type</span>
                  <span
                    className={`font-semibold ${
                      order.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {order.side} {order.orderType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Limit Price</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {order.orderType === 'LIMIT' ? formatINR(order.priceInPaise) : 'Market'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Filled: <strong className="text-slate-200">{formatQuantity(order.filledQuantity)}</strong> / {formatQuantity(order.quantity)} shares
                  </span>
                  <span className="font-mono font-medium text-sky-400">{fillPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      order.status === 'FILLED'
                        ? 'bg-emerald-500'
                        : order.status === 'CANCELLED'
                        ? 'bg-zinc-600'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>

              {/* Executions Section */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                  Execution Matches ({executions.length})
                </h4>
                {executions.length === 0 ? (
                  <p className="text-slate-400 italic bg-slate-900/40 p-3 rounded-lg border border-slate-800/40 text-[11px]">
                    No execution matches recorded for this order yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-mono">
                        <tr>
                          <th className="py-2 px-3">Execution ID</th>
                          <th className="py-2 px-3">Price</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3">Notional</th>
                          <th className="py-2 px-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {executions.map((exec) => (
                          <tr key={exec.executionId || exec._id} className="hover:bg-slate-800/20">
                            <td className="py-2 px-3 text-slate-400">{exec.executionId}</td>
                            <td className="py-2 px-3 font-medium text-slate-200">{formatINR(exec.priceInPaise)}</td>
                            <td className="py-2 px-3 text-slate-300">{formatQuantity(exec.quantity)}</td>
                            <td className="py-2 px-3 text-emerald-400">{formatINR(exec.notionalPaise)}</td>
                            <td className="py-2 px-3 text-slate-400">{formatDateTime(exec.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Append-only Event History Timeline */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Append-Only Audit Trail ({events.length})
                </h4>
                <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
                  {events.map((evt, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-[#121826] group-hover:bg-sky-400 transition-colors" />
                      <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-sky-400">
                            {evt.eventType}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {formatDateTime(evt.timestamp)}
                          </span>
                        </div>
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <pre className="mt-1 text-[10px] text-slate-400 overflow-x-auto bg-slate-950/60 p-1.5 rounded font-mono">
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
