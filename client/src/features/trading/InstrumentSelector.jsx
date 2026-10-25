import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext.jsx';
import { formatINR } from '../../utils/formatters.js';
import { Search, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

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
        className="w-full flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg px-3.5 py-2.5 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-sky-400 text-xs">
            {selectedInstrument?.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                {selectedInstrument?.symbol || 'Select Stock'}
              </span>
              <span className="text-[10px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                NSE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
              {selectedInstrument?.displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedInstrument && (
            <div className="text-right">
              <span className="block font-mono font-semibold text-slate-100 text-sm">
                {formatINR(selectedInstrument.lastPricePaise || selectedInstrument.simulatedReferencePricePaise)}
              </span>
              <span className="text-[10px] text-slate-400">Ref: {formatINR(selectedInstrument.simulatedReferencePricePaise)}</span>
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-[#121826] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search symbol or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40">
              {filtered.map((inst) => (
                <button
                  key={inst.symbol}
                  onClick={() => {
                    setSelectedSymbol(inst.symbol);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-800/50 transition-colors ${
                    selectedSymbol === inst.symbol ? 'bg-sky-950/20' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-xs">
                        {inst.symbol}
                      </span>
                      {selectedSymbol === inst.symbol && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                      {inst.displayName}
                    </span>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="font-medium text-slate-200 block">
                      {formatINR(inst.lastPricePaise || inst.simulatedReferencePricePaise)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Tick: {formatINR(inst.tickSizePaise)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
