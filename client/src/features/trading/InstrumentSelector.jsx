import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext.jsx';
import { formatINR } from '../../utils/formatters.js';
import { Search, ChevronDown, Check } from 'lucide-react';

export function InstrumentSelector() {
  const { instruments, selectedSymbol, setSelectedSymbol, selectedInstrument } = useTrading();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = instruments.filter(
    (i) =>
      i.symbol.toLowerCase().includes(search.toLowerCase()) ||
      i.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-left transition-colors shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E6F4EF] border border-[#A7F3D0] flex items-center justify-center font-bold text-[#087F5B] text-xs">
            {selectedInstrument?.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#172B4D] text-sm">
                {selectedInstrument?.symbol || 'Select Stock'}
              </span>
              <span className="text-[10px] bg-[#F1F5F9] text-[#667085] px-1.5 py-0.5 rounded font-mono font-medium border border-[#E2E8F0]">
                NSE
              </span>
            </div>
            <p className="text-[11px] text-[#667085] truncate max-w-[180px] sm:max-w-[220px]">
              {selectedInstrument?.displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedInstrument && (
            <div className="text-right">
              <span className="block font-mono font-bold text-[#172B4D] text-sm">
                {formatINR(selectedInstrument.lastPricePaise || selectedInstrument.simulatedReferencePricePaise)}
              </span>
              <span className="text-[10px] text-[#667085]">
                Ref: {formatINR(selectedInstrument.simulatedReferencePricePaise)}
              </span>
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-[#667085]" />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search symbol or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-[#E2E8F0]">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-[#667085] text-xs italic">
                  No stocks match "{search}"
                </div>
              ) : (
                filtered.map((inst) => {
                  const isSelected = selectedSymbol === inst.symbol;
                  return (
                    <button
                      key={inst.symbol}
                      onClick={() => {
                        setSelectedSymbol(inst.symbol);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#E6F4EF] text-[#087F5B]'
                          : 'hover:bg-[#F8FAFC] text-[#172B4D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">
                            {inst.symbol}
                          </span>
                          <span className="text-[10px] text-[#667085]">
                            {inst.displayName}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#667085] font-mono">
                          Tick: {formatINR(inst.tickSizePaise)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div className="font-mono text-xs">
                          <span className="font-semibold block">
                            {formatINR(inst.lastPricePaise || inst.simulatedReferencePricePaise)}
                          </span>
                          <span className="text-[10px] text-[#667085]">
                            Ref: {formatINR(inst.simulatedReferencePricePaise)}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#087F5B]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
