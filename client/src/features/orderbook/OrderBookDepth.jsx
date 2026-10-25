import React from 'react';
import { useTrading } from '../../context/TradingContext.jsx';
import { formatINR, formatQuantity, paiseToRupees } from '../../utils/formatters.js';
import { ArrowDown, ArrowUp, Layers, RefreshCw } from 'lucide-react';

export function OrderBookDepth({ onSelectPrice }) {
  const { orderBook, selectedSymbol, refreshAll } = useTrading();

  const bids = orderBook?.bids || [];
  const asks = orderBook?.asks || [];
  const bestBid = orderBook?.bestBid;
  const bestAsk = orderBook?.bestAsk;
  const spreadInPaise = orderBook?.spreadInPaise;

  const maxBidQty = bids.reduce((max, b) => Math.max(max, b.totalQuantity), 0) || 1;
  const maxAskQty = asks.reduce((max, a) => Math.max(max, a.totalQuantity), 0) || 1;
  const maxDepthQty = Math.max(maxBidQty, maxAskQty);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 flex flex-col h-full shadow-2xs">
      {/* Title & Refresh Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#087F5B]" />
          <h3 className="font-semibold text-[#172B4D] text-xs">
            Live Order Book <span className="font-mono text-[#667085]">({selectedSymbol})</span>
          </h3>
        </div>
        <button
          onClick={refreshAll}
          className="text-[#667085] hover:text-[#172B4D] p-1 rounded hover:bg-[#F1F5F9] transition-colors"
          title="Refresh depth"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Spread banner */}
      <div className="my-2.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#667085] uppercase tracking-wider font-sans font-medium">Spread:</span>
          <span className="font-semibold text-[#172B4D]">
            {spreadInPaise !== null ? formatINR(spreadInPaise) : 'No Overlap'}
          </span>
        </div>
        <div className="text-[11px] text-[#667085] flex items-center gap-2 font-sans">
          <span>Bid: <strong className="text-[#087F5B] font-mono">{bestBid ? formatINR(bestBid.priceInPaise) : '-'}</strong></span>
          <span className="text-[#CBD5E1]">|</span>
          <span>Ask: <strong className="text-[#D64545] font-mono">{bestAsk ? formatINR(bestAsk.priceInPaise) : '-'}</strong></span>
        </div>
      </div>

      {/* Depth Tables Grid: Bids (left) and Asks (right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-hidden min-h-[300px]">
        {/* BUY / BIDS COLUMN */}
        <div className="flex flex-col border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
          <div className="bg-[#E6F4EF] px-3 py-1.5 border-b border-[#A7F3D0] flex items-center justify-between text-[11px] font-semibold text-[#087F5B]">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              Bids (Buy)
            </span>
            <span className="text-[10px] font-mono font-medium text-[#087F5B]">
              {orderBook?.totalBidQuantity || 0} Qty
            </span>
          </div>

          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase font-mono text-[#667085] border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-[#E2E8F0]">
            {bids.length === 0 ? (
              <div className="py-8 text-center text-[#94A3B8] text-xs italic">
                No active buy orders
              </div>
            ) : (
              bids.map((level) => {
                const depthPct = Math.min(100, Math.round((level.totalQuantity / maxDepthQty) * 100));
                return (
                  <div
                    key={level.priceInPaise}
                    onClick={() => onSelectPrice && onSelectPrice(paiseToRupees(level.priceInPaise))}
                    className="relative grid grid-cols-3 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-[#F0FDF4] transition-colors"
                    title="Click to fill limit price"
                  >
                    {/* Visual depth bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#087F5B]/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#087F5B]">
                      {formatINR(level.priceInPaise)}
                    </span>
                    <span className="relative z-10 text-right text-[#172B4D] font-medium">
                      {formatQuantity(level.totalQuantity)}
                    </span>
                    <span className="relative z-10 text-right text-[#667085] text-[11px]">
                      {level.orderCount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SELL / ASKS COLUMN */}
        <div className="flex flex-col border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
          <div className="bg-[#FEF2F2] px-3 py-1.5 border-b border-[#FECACA] flex items-center justify-between text-[11px] font-semibold text-[#D64545]">
            <span className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              Asks (Sell)
            </span>
            <span className="text-[10px] font-mono font-medium text-[#D64545]">
              {orderBook?.totalAskQuantity || 0} Qty
            </span>
          </div>

          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase font-mono text-[#667085] border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-[#E2E8F0]">
            {asks.length === 0 ? (
              <div className="py-8 text-center text-[#94A3B8] text-xs italic">
                No active sell orders
              </div>
            ) : (
              asks.map((level) => {
                const depthPct = Math.min(100, Math.round((level.totalQuantity / maxDepthQty) * 100));
                return (
                  <div
                    key={level.priceInPaise}
                    onClick={() => onSelectPrice && onSelectPrice(paiseToRupees(level.priceInPaise))}
                    className="relative grid grid-cols-3 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-[#FFF1F2] transition-colors"
                    title="Click to fill limit price"
                  >
                    {/* Visual depth bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#D64545]/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#D64545]">
                      {formatINR(level.priceInPaise)}
                    </span>
                    <span className="relative z-10 text-right text-[#172B4D] font-medium">
                      {formatQuantity(level.totalQuantity)}
                    </span>
                    <span className="relative z-10 text-right text-[#667085] text-[11px]">
                      {level.orderCount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
