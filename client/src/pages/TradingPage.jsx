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
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Simulated Last Price</span>
              <span className="text-base font-bold text-[#172B4D]">
                {formatINR(selectedInstrument.lastPricePaise || selectedInstrument.simulatedReferencePricePaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Reference Price</span>
              <span className="text-[#172B4D] font-medium">
                {formatINR(selectedInstrument.simulatedReferencePricePaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Day Range</span>
              <span className="text-[#667085]">
                {formatINR(selectedInstrument.dayLowPaise)} - {formatINR(selectedInstrument.dayHighPaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block font-sans">Tick Size</span>
              <span className="text-[#667085]">
                {formatINR(selectedInstrument.tickSizePaise)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Trading Area: Order Book (Left) + Order Ticket (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Order Book Depth (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <OrderBookDepth onSelectPrice={(price) => setPrefilledPrice(price)} />
        </div>

        {/* Order Ticket (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <OrderTicket
            prefilledPrice={prefilledPrice}
            onOrderSubmitted={handleOrderSubmitted}
          />
        </div>
      </div>

      {/* Bottom Panels: Recent Orders for Instrument & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders for Selected Instrument */}
        <div className="space-y-2">
          <h3 className="font-semibold text-[#172B4D] text-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#087F5B]" />
            Your Recent Orders ({selectedSymbol})
          </h3>
          <OrdersTable orders={instrumentOrders} onOrderUpdated={loadInstrumentData} />
        </div>

        {/* Recent Executions for Selected Instrument */}
        <div className="space-y-2">
          <h3 className="font-semibold text-[#172B4D] text-xs flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#087F5B]" />
            Recent Executions ({selectedSymbol})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Exec ID</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Shares</th>
                  <th className="py-2.5 px-3">Notional</th>
                  <th className="py-2.5 px-3">Time</th>
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
