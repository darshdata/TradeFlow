import React from 'react';
import { ShieldCheck, Clock, Zap } from 'lucide-react';
import { useTrading } from '../context/TradingContext.jsx';

export function SimulatedBanner() {
  const { marketStatus, isExtendedSimulation, setMarketModalOpen } = useTrading();

  return (
    <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#667085] px-3 sm:px-6 py-1 sm:py-1.5 text-xs w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#087F5B] shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight text-[#475569] truncate sm:whitespace-normal">
            <strong className="text-[#172B4D] font-medium">Simulated Trading Platform:</strong>{' '}
            TradeFlow is a simulated equity execution environment. Orders do not connect to live stock exchanges or real brokers.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono shrink-0">
          <button
            type="button"
            onClick={() => setMarketModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#E6F4EF] hover:bg-[#A7F3D0] text-[#087F5B] px-2 py-0.5 rounded border border-[#A7F3D0] transition-colors"
          >
            {isExtendedSimulation ? (
              <>
                <Zap className="w-3 h-3 text-[#087F5B]" />
                <span>24/7 Sim Mode</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-[#B45309]" />
                <span>{marketStatus?.isRegularOpen ? 'Market Open' : 'Market Closed'}</span>
              </>
            )}
          </button>
          <span className="text-[#087F5B] bg-[#E6F4EF] px-2 py-0.5 rounded border border-[#A7F3D0]">
            Price-Time FIFO
          </span>
        </div>
      </div>
    </div>
  );
}
