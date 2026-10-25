import React from 'react';
import { useTrading } from '../context/TradingContext.jsx';
import { InstrumentSelector } from '../features/trading/InstrumentSelector.jsx';
import { OrderBookDepth } from '../features/orderbook/OrderBookDepth.jsx';
import { Info, BookOpen } from 'lucide-react';

export function OrderBookPage() {
  const { selectedSymbol } = useTrading();

  return (
    <div className="space-y-5">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#087F5B]" />
            Market Depth
          </h1>
          <p className="text-xs text-[#667085]">
            Market depth shows the active buy and sell interest currently available in this simulated order book.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <InstrumentSelector />
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-xs text-[#667085] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#172B4D]">Simulated Order Book Mechanics:</strong> Bids (Buy Side) are sorted by price descending (highest willingness to buy), and Asks (Sell Side) are sorted by price ascending (lowest willingness to sell). Working orders at identical price levels are matched by arrival time (FIFO). The spread represents the difference between the Best Ask and Best Bid.
        </p>
      </div>

      {/* Full height depth table */}
      <div className="min-h-[520px]">
        <OrderBookDepth />
      </div>
    </div>
  );
}
