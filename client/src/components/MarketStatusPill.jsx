import React from 'react';
import { useTrading } from '../context/TradingContext.jsx';
import { Clock, Zap } from 'lucide-react';

export function MarketStatusPill({ className = '' }) {
  const { marketStatus, isExtendedSimulation, setMarketModalOpen } = useTrading();

  return (
    <button
      type="button"
      onClick={() => setMarketModalOpen(true)}
      title="Click to view exchange schedule or toggle 24/7 interview simulation mode"
      className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border shadow-2xs ${
        isExtendedSimulation
          ? 'bg-[#E6F4EF] hover:bg-[#d1fae5] text-[#087F5B] border-[#A7F3D0]'
          : marketStatus?.isRegularOpen
          ? 'bg-[#E6F4EF] hover:bg-[#d1fae5] text-[#087F5B] border-[#A7F3D0]'
          : 'bg-[#FEF3C7] hover:bg-[#fde68a] text-[#B45309] border-[#FDE68A]'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isExtendedSimulation || marketStatus?.isRegularOpen
              ? 'bg-[#087F5B]'
              : 'bg-[#B45309]'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isExtendedSimulation || marketStatus?.isRegularOpen
              ? 'bg-[#087F5B]'
              : 'bg-[#B45309]'
          }`}
        />
      </span>

      <div className="flex items-center gap-1.5 font-medium">
        {isExtendedSimulation ? (
          <>
            <span className="hidden min-[480px]:inline text-[#475569] font-sans text-[11px]">
              {marketStatus?.isRegularOpen ? 'Live Market' : 'Exchange Closed'} •
            </span>
            <span className="font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#087F5B]" />
              24/7 Sim Active
            </span>
          </>
        ) : marketStatus?.isRegularOpen ? (
          <span className="font-semibold">Exchange Open</span>
        ) : (
          <span className="font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#B45309]" />
            Exchange Closed
          </span>
        )}
      </div>

      <span className="text-[10px] text-[#667085] hidden md:inline border-l border-current/20 pl-1.5">
        {marketStatus?.istTimeShort}
      </span>
    </button>
  );
}
