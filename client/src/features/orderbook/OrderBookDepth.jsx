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
    <div className="bg-[#111622] border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-sm">
      {/* Title & Spread Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-xs">
            Live Order Book <span className="font-mono text-slate-400">({selectedSymbol})</span>
          </h3>
        </div>
        <button
          onClick={refreshAll}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded"
          title="Refresh depth"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Spread banner */}
      <div className="my-2.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Spread</span>
          <span className="font-semibold text-sky-400">
            {spreadInPaise !== null ? formatINR(spreadInPaise) : 'No Spread'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-2 font-sans">
          <span>Bid: <strong className="text-emerald-400 font-mono">{bestBid ? formatINR(bestBid.priceInPaise) : '-'}</strong></span>
          <span>|</span>
          <span>Ask: <strong className="text-rose-400 font-mono">{bestAsk ? formatINR(bestAsk.priceInPaise) : '-'}</strong></span>
        </div>
      </div>

      {/* Depth Tables Grid: Asks (top or right) and Bids (bottom or left) */}
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
        {/* BUY / BIDS COLUMN */}
        <div className="flex flex-col border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/30">
          <div className="bg-emerald-950/30 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              Bids (Buy)
            </span>
            <span className="text-[10px] font-mono text-emerald-500/80">
              {orderBook?.totalBidQuantity || 0} Qty
            </span>
          </div>

          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800/60 bg-slate-900/60">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/20">
            {bids.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No active buy orders
              </div>
            ) : (
              bids.map((level) => {
                const depthPct = Math.min(100, Math.round((level.totalQuantity / maxDepthQty) * 100));
                return (
                  <div
                    key={level.priceInPaise}
                    onClick={() => onSelectPrice && onSelectPrice(paiseToRupees(level.priceInPaise))}
                    className="relative grid grid-cols-3 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-emerald-950/20 transition-colors"
                  >
                    {/* Visual depth bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-medium text-emerald-400">
                      {formatINR(level.priceInPaise)}
                    </span>
                    <span className="relative z-10 text-right text-slate-200">
                      {formatQuantity(level.totalQuantity)}
                    </span>
                    <span className="relative z-10 text-right text-slate-400 text-[11px]">
                      {level.orderCount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SELL / ASKS COLUMN */}
        <div className="flex flex-col border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/30">
          <div className="bg-rose-950/30 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-semibold text-rose-400">
            <span className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              Asks (Sell)
            </span>
            <span className="text-[10px] font-mono text-rose-500/80">
              {orderBook?.totalAskQuantity || 0} Qty
            </span>
          </div>

          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800/60 bg-slate-900/60">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/20">
            {asks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No active sell orders
              </div>
            ) : (
              asks.map((level) => {
                const depthPct = Math.min(100, Math.round((level.totalQuantity / maxDepthQty) * 100));
                return (
                  <div
                    key={level.priceInPaise}
                    onClick={() => onSelectPrice && onSelectPrice(paiseToRupees(level.priceInPaise))}
                    className="relative grid grid-cols-3 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-rose-950/20 transition-colors"
                  >
                    {/* Visual depth bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-medium text-rose-400">
                      {formatINR(level.priceInPaise)}
                    </span>
                    <span className="relative z-10 text-right text-slate-200">
                      {formatQuantity(level.totalQuantity)}
                    </span>
                    <span className="relative z-10 text-right text-slate-400 text-[11px]">
                      {level.orderCount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 text-[10px] text-slate-500 text-center">
        Aggregated from active resting orders on backend matching book. Click level to set ticket price.
      </div>
    </div>
  );
}
