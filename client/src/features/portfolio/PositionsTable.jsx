import React from 'react';
import {
  formatINR,
  formatQuantity,
  formatPercentage,
} from '../../utils/formatters.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function PositionsTable({ positions = [] }) {
  return (
    <div className="space-y-3">
      {/* Mobile Positions Card View (< sm) */}
      <div className="sm:hidden space-y-2.5">
        {positions.length === 0 ? (
          <div className="py-8 text-center text-[#94A3B8] italic bg-white rounded-xl border border-[#E2E8F0] text-xs">
            No open positions. Positions are created when buy orders execute.
          </div>
        ) : (
          positions.map((pos) => {
            const isProfit = pos.unrealizedPnlPaise >= 0;
            return (
              <div
                key={pos.instrument}
                className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#172B4D] text-sm font-sans">{pos.instrument}</span>
                    <span className="text-[10px] bg-[#F1F5F9] text-[#667085] px-1.5 py-0.5 rounded font-mono">
                      NSE
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono ${
                      isProfit
                        ? 'bg-[#E6F4EF] text-[#087F5B] border border-[#A7F3D0]'
                        : 'bg-[#FEE2E2] text-[#D64545] border border-[#FECACA]'
                    }`}
                  >
                    {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatINR(pos.unrealizedPnlPaise)} ({formatPercentage(pos.unrealizedPnlPercentage)})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#667085] font-sans block">Owned / Avail</span>
                    <span className="font-semibold text-[#172B4D]">
                      {formatQuantity(pos.ownedQuantity)}
                    </span>
                    <span className="text-[10px] text-[#087F5B] block">
                      Avail: {formatQuantity(pos.availableQuantity)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#667085] font-sans block">Average Cost</span>
                    <span className="text-[#667085]">
                      {formatINR(pos.averageCostPricePaise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#667085] font-sans block">CMP</span>
                    <span className="font-semibold text-[#172B4D]">
                      {formatINR(pos.currentPricePaise)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-[11px] font-mono">
                  <span className="text-[#667085] font-sans text-[10px]">
                    Cost Basis: <strong className="font-mono text-[#172B4D]">{formatINR(pos.totalCostBasisPaise)}</strong>
                  </span>
                  <span className="font-semibold text-[#172B4D]">
                    Market Value: {formatINR(pos.marketValuePaise)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Table View (>= sm) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs min-w-0 max-w-full">
        <table className="w-full text-left text-xs min-w-[850px]">
          <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3 px-3.5">Instrument</th>
              <th className="py-3 px-3">Owned Quantity</th>
              <th className="py-3 px-3">Reserved Quantity</th>
              <th className="py-3 px-3">Available Quantity</th>
              <th className="py-3 px-3">Average Cost</th>
              <th className="py-3 px-3">Current Price</th>
              <th className="py-3 px-3">Cost Basis</th>
              <th className="py-3 px-3">Market Value</th>
              <th className="py-3 px-3.5 text-right">Unrealized P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#94A3B8] italic font-sans">
                  No open positions. Positions are created when buy orders execute.
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
    </div>
  );
}
