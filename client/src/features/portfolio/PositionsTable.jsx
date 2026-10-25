import React from 'react';
import {
  formatINR,
  formatQuantity,
  formatPercentage,
} from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, Briefcase } from 'lucide-react';

export function PositionsTable({ positions = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111622] shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
          <tr>
            <th className="py-3 px-3.5">Instrument</th>
            <th className="py-3 px-3">Owned Shares</th>
            <th className="py-3 px-3">Reserved</th>
            <th className="py-3 px-3">Available</th>
            <th className="py-3 px-3">Avg Cost Price</th>
            <th className="py-3 px-3">Current Market Price</th>
            <th className="py-3 px-3">Total Investment</th>
            <th className="py-3 px-3">Market Value</th>
            <th className="py-3 px-3.5 text-right">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
          {positions.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                No active stock holdings in portfolio.
              </td>
            </tr>
          ) : (
            positions.map((pos) => {
              const isProfit = pos.unrealizedPnlPaise >= 0;
              return (
                <tr
                  key={pos.instrument}
                  className="hover:bg-slate-850/40 transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">
                    {pos.instrument}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">
                    {formatQuantity(pos.ownedQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-amber-400">
                    {formatQuantity(pos.reservedQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400">
                    {formatQuantity(pos.availableQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {formatINR(pos.averageCostPricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {formatINR(pos.currentPricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {formatINR(pos.totalCostBasisPaise)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-100">
                    {formatINR(pos.marketValuePaise)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-medium">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatINR(pos.unrealizedPnlPaise)} ({formatPercentage(pos.unrealizedPnlPercentage)})
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
