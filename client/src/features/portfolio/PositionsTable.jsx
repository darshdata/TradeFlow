import React from 'react';
import {
  formatINR,
  formatQuantity,
  formatPercentage,
} from '../../utils/formatters.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function PositionsTable({ positions = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
      <table className="w-full text-left text-xs min-w-[850px]">
        <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
          <tr>
            <th className="py-3 px-3.5">Instrument</th>
            <th className="py-3 px-3">Owned Shares</th>
            <th className="py-3 px-3">Reserved</th>
            <th className="py-3 px-3">Available</th>
            <th className="py-3 px-3">Avg Cost Price</th>
            <th className="py-3 px-3">Market Price</th>
            <th className="py-3 px-3">Total Investment</th>
            <th className="py-3 px-3">Market Value</th>
            <th className="py-3 px-3.5 text-right">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
          {positions.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-[#94A3B8] italic font-sans">
                No active stock holdings in portfolio.
              </td>
            </tr>
          ) : (
            positions.map((pos) => {
              const isProfit = pos.unrealizedPnlPaise >= 0;
              return (
                <tr
                  key={pos.instrument}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-bold text-[#172B4D] font-sans">
                    {pos.instrument}
                  </td>
                  <td className="py-2.5 px-3 text-[#172B4D] font-semibold">
                    {formatQuantity(pos.ownedQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-[#B7791F]">
                    {formatQuantity(pos.reservedQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-[#087F5B] font-semibold">
                    {formatQuantity(pos.availableQuantity)}
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {formatINR(pos.averageCostPricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#172B4D]">
                    {formatINR(pos.currentPricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {formatINR(pos.totalCostBasisPaise)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#172B4D]">
                    {formatINR(pos.marketValuePaise)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-medium">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        isProfit
                          ? 'bg-[#E6F4EF] text-[#087F5B] border border-[#A7F3D0]'
                          : 'bg-[#FEE2E2] text-[#D64545] border border-[#FECACA]'
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
