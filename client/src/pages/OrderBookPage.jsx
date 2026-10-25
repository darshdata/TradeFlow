import React from 'react';
import { useTrading } from '../context/TradingContext.jsx';
import { InstrumentSelector } from '../features/trading/InstrumentSelector.jsx';
import { OrderBookDepth } from '../features/orderbook/OrderBookDepth.jsx';
import { ShieldAlert, BookOpen } from 'lucide-react';

export function OrderBookPage() {
  const { selectedSymbol } = useTrading();

  return (
    <div className="space-y-5">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111622] p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Aggregated Level 2 Order Book Depth
          </h1>
          <p className="text-xs text-slate-400">
            Real-time market depth reconstructed deterministically from active resting limit orders.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <InstrumentSelector />
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Order Book Mechanics:</strong> Bids are sorted by price descending (highest willingness to buy), and Asks are sorted by price ascending (lowest willingness to sell). Equal prices are sequenced by arrival time (FIFO). The spread represents the difference between the lowest ask and highest bid.
        </p>
      </div>

      {/* Full height depth table */}
      <div className="h-[580px]">
        <OrderBookDepth />
      </div>
    </div>
  );
}
