import React from 'react';
import { useTrading } from '../context/TradingContext.jsx';
import { Clock, ShieldCheck, Zap, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export function MarketStatusModal({ isOpen, onClose }) {
  const {
    marketStatus,
    isExtendedSimulation,
    setExtendedSimulation,
  } = useTrading();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E6F4EF] border border-[#A7F3D0] flex items-center justify-center text-[#087F5B]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#172B4D] text-sm">
                Exchange Schedule &amp; Simulation Engine
              </h3>
              <p className="text-[11px] text-[#667085] font-mono">
                {marketStatus?.istTime} • {marketStatus?.weekday}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#667085] hover:text-[#172B4D] p-1.5 rounded-md hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-[#172B4D]">
          {/* Current Real-world Market Status Card */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#667085] text-[11px] font-medium uppercase tracking-wider">
                Regular Exchange Status (NSE / BSE Schedule)
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  marketStatus?.isRegularOpen
                    ? 'bg-[#E6F4EF] text-[#087F5B] border-[#A7F3D0]'
                    : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    marketStatus?.isRegularOpen ? 'bg-[#087F5B] animate-pulse' : 'bg-[#B45309]'
                  }`}
                />
                {marketStatus?.sessionLabel || 'Closed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-[#667085] block text-[10px] font-sans">Trading Hours</span>
                <span className="font-medium text-[#172B4D]">09:15 – 15:30 IST</span>
              </div>
              <div>
                <span className="text-[#667085] block text-[10px] font-sans">Trading Days</span>
                <span className="font-medium text-[#172B4D]">Mon – Fri (Excl. Holidays)</span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#172B4D]">
              Select Order Execution Mode
            </label>

            {/* Mode 1: 24/7 Extended Simulation (Interview Mode) */}
            <div
              onClick={() => setExtendedSimulation(true)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                isExtendedSimulation
                  ? 'border-[#087F5B] bg-[#E6F4EF]/40 shadow-xs'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded-md bg-[#E6F4EF] text-[#087F5B]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#172B4D] text-xs">
                        24/7 Extended Simulation (Interview Mode)
                      </span>
                      <span className="text-[9px] bg-[#087F5B] text-white px-1.5 py-0.2 rounded font-mono font-semibold">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Continuous matching engine active 24/7. Orders execute and match immediately
                      against resting limit liquidity regardless of actual market hours.
                    </p>
                  </div>
                </div>
                {isExtendedSimulation && (
                  <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0" />
                )}
              </div>
            </div>

            {/* Mode 2: Strict Exchange Hours Enforcement */}
            <div
              onClick={() => setExtendedSimulation(false)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                !isExtendedSimulation
                  ? 'border-[#087F5B] bg-[#E6F4EF]/40 shadow-xs'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded-md bg-[#FEF3C7] text-[#B45309]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-[#172B4D] text-xs block">
                      Strict Exchange Hours Enforcement
                    </span>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Replicates real exchange constraints. Order submission is blocked when the
                      market is closed (outside 09:15 – 15:30 IST or on weekends).
                    </p>
                  </div>
                </div>
                {!isExtendedSimulation && (
                  <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Fintech Interview Explainer Note */}
          <div className="p-3 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl text-[11px] text-[#475569] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#172B4D]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>How to explain this in your interview:</span>
            </div>
            <p className="leading-relaxed">
              "In production exchanges, regular trading is restricted to 09:15–15:30 IST, and off-hour
              orders become AMOs (After Market Orders). In TradeFlow, I implemented both: an
              institutional market schedule detector and an Extended Simulation Mode to demonstrate live
              price-time matching during evening evaluations."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-semibold transition-all shadow-2xs"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
