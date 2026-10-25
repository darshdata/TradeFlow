import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext.jsx';
import { InstrumentSelector } from '../features/trading/InstrumentSelector.jsx';
import { OrderTicket } from '../features/trading/OrderTicket.jsx';
import { OrderBookDepth } from '../features/orderbook/OrderBookDepth.jsx';
import { OrdersTable } from '../features/orders/OrdersTable.jsx';
import { api } from '../api/client.js';
import { formatINR, formatDateTime, formatQuantity } from '../utils/formatters.js';
import { Activity, Clock } from 'lucide-react';

export function TradingPage() {
  const { selectedSymbol, selectedInstrument, refreshAll } = useTrading();
  const [prefilledPrice, setPrefilledPrice] = useState('');
  const [instrumentOrders, setInstrumentOrders] = useState([]);
  const [instrumentExecutions, setInstrumentExecutions] = useState([]);

  const loadInstrumentData = async () => {
    if (!selectedSymbol) return;
    try {
      const [ordRes, execRes] = await Promise.all([
        api.orders.getAll({ instrument: selectedSymbol, limit: 5 }),
        api.executions.getAll({ instrument: selectedSymbol, limit: 6 }),
      ]);
      setInstrumentOrders(ordRes?.orders || []);
      setInstrumentExecutions(execRes?.executions || []);
    } catch (err) {
      console.error('Failed to load instrument activity', err);
    }
  };

  useEffect(() => {
    loadInstrumentData();
  }, [selectedSymbol]);

  const handleOrderSubmitted = () => {
    loadInstrumentData();
    refreshAll();
  };

  return (
    <div className="space-y-5">
      {/* Top Bar: Instrument Selector & Market Info */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <InstrumentSelector />
        </div>

        {selectedInstrument && (
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 sm:flex sm:flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Simulated Price</span>
              <span className="text-sm sm:text-base font-bold text-[#172B4D]">
                {formatINR(selectedInstrument.lastPricePaise || selectedInstrument.simulatedReferencePricePaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Reference Price</span>
              <span className="text-[#172B4D] font-medium text-xs sm:text-sm">
                {formatINR(selectedInstrument.simulatedReferencePricePaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Day Range</span>
              <span className="text-[#667085] text-[11px]">
                {formatINR(selectedInstrument.dayLowPaise)} - {formatINR(selectedInstrument.dayHighPaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Tick Size</span>
              <span className="text-[#667085] text-xs">
                {formatINR(selectedInstrument.tickSizePaise)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Trading Area: Order Book (Left) + Order Ticket (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Order Book Depth (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-w-0">
          <OrderBookDepth onSelectPrice={(price) => setPrefilledPrice(price)} />
        </div>

        {/* Order Ticket (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-w-0">
          <OrderTicket
            prefilledPrice={prefilledPrice}
            onOrderSubmitted={handleOrderSubmitted}
          />
        </div>
      </div>

      {/* Bottom Panels: Recent Orders for Instrument & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        {/* Recent Orders for Selected Instrument */}
        <div className="space-y-2 min-w-0">
          <h3 className="font-semibold text-[#172B4D] text-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#087F5B]" />
            Working & Recent Orders ({selectedSymbol})
          </h3>
          <OrdersTable orders={instrumentOrders} onOrderUpdated={loadInstrumentData} />
        </div>

        {/* Recent Executions for Selected Instrument */}
        <div className="space-y-2 min-w-0">
          <h3 className="font-semibold text-[#172B4D] text-xs flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#087F5B]" />
            Recent Executions ({selectedSymbol})
          </h3>

          {/* Mobile Executions Card View (< sm) */}
          <div className="sm:hidden space-y-2">
            {instrumentExecutions.length === 0 ? (
              <div className="py-6 text-center text-[#94A3B8] italic bg-white rounded-xl border border-[#E2E8F0] text-xs">
                No executions recorded yet for {selectedSymbol}.
              </div>
            ) : (
              instrumentExecutions.map((exec) => (
                <div
                  key={exec.executionId || exec._id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        exec.userSide === 'BUY'
                          ? 'bg-[#E6F4EF] text-[#087F5B]'
                          : 'bg-[#FEE2E2] text-[#D64545]'
                      }`}
                    >
                      {exec.userSide}
                    </span>
                    <span className="font-semibold text-[#087F5B]">
                      {formatINR(exec.notionalPaise)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#667085] font-sans">
                      {formatQuantity(exec.quantity)} shares @ {formatINR(exec.priceInPaise)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {formatDateTime(exec.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Tablet Executions Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs min-w-0 max-w-full">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Execution Reference</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Execution Price</th>
                  <th className="py-2.5 px-3">Executed Qty</th>
                  <th className="py-2.5 px-3">Notional Value</th>
                  <th className="py-2.5 px-3">Execution Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                {instrumentExecutions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#94A3B8] italic font-sans">
                      No executions recorded yet for {selectedSymbol}.
                    </td>
                  </tr>
                ) : (
                  instrumentExecutions.map((exec) => (
                    <tr key={exec.executionId || exec._id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-3 text-[#667085] text-[10px]">
                        {exec.executionId}
                      </td>
                      <td className="py-2 px-3 font-semibold">
                        <span
                          className={exec.userSide === 'BUY' ? 'text-[#087F5B]' : 'text-[#D64545]'}
                        >
                          {exec.userSide}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-[#172B4D]">
                        {formatINR(exec.priceInPaise)}
                      </td>
                      <td className="py-2 px-3 text-[#172B4D]">
                        {formatQuantity(exec.quantity)}
                      </td>
                      <td className="py-2 px-3 text-[#087F5B] font-semibold">
                        {formatINR(exec.notionalPaise)}
                      </td>
                      <td className="py-2 px-3 text-[#667085] text-[10px]">
                        {formatDateTime(exec.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
