import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { PositionsTable } from '../features/portfolio/PositionsTable.jsx';
import { formatINR, formatPercentage } from '../utils/formatters.js';
import {
  Briefcase,
  Wallet,
  Lock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#087F5B', '#0D9488', '#2563EB', '#6366F1', '#D97706', '#E11D48', '#64748B'];

export function PortfolioPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const data = await api.portfolio.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load portfolio', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const account = summary?.account;
  const metrics = summary?.metrics;
  const positions = summary?.positions || [];
  const audit = summary?.audit;

  // Chart data: Cash + each stock holding
  const chartData = [
    {
      name: 'Available Cash',
      value: (account?.availableCashPaise || 0) / 100,
    },
    ...(account?.reservedCashPaise > 0
      ? [{ name: 'Reserved Cash', value: account.reservedCashPaise / 100 }]
      : []),
    ...positions.map((p) => ({
      name: p.instrument,
      value: p.marketValuePaise / 100,
    })),
  ].filter((item) => item.value > 0);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#087F5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#087F5B]" />
            Positions &amp; Account Balances
          </h1>
          <p className="text-xs text-[#667085]">
            Monitor simulated equity holdings, share reservations, cost basis, and realized profit/loss.
          </p>
        </div>

        {audit?.isReconciled && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E6F4EF] border border-[#A7F3D0] rounded-lg text-[#087F5B] text-xs font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Ledger Invariants Reconciled</span>
          </div>
        )}
      </div>

      {/* KPI Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account Equity */}
        <div
          className="bg-white border border-[#E2E8F0] p-4.5 rounded-xl shadow-2xs space-y-1.5"
          title="Total simulated account valuation combining free cash, reserved cash, and marked position values."
        >
          <span className="text-[#667085] text-xs font-medium block">Account Equity</span>
          <span className="text-2xl font-bold font-mono text-[#172B4D] block tracking-tight">
            {formatINR(metrics?.totalPortfolioValuePaise || 0)}
          </span>
          <span className="text-[11px] text-[#667085]">Total Cash + Marked Stock Values</span>
        </div>

        {/* Free Available Cash */}
        <div
          className="bg-white border border-[#E2E8F0] p-4.5 rounded-xl shadow-2xs space-y-1.5"
          title="Cash currently available for new buy orders after accounting for existing reservations."
        >
          <span className="text-[#667085] text-xs font-medium block">Available Cash</span>
          <span className="text-2xl font-bold font-mono text-[#087F5B] block tracking-tight">
            {formatINR(account?.availableCashPaise || 0)}
          </span>
          <span className="text-[11px] text-[#667085]">Free unreserved cash capital</span>
        </div>

        {/* Locked Reserved Cash */}
        <div
          className="bg-white border border-[#E2E8F0] p-4.5 rounded-xl shadow-2xs space-y-1.5"
          title="Cash committed to active buy orders that have not yet been fully executed or cancelled."
        >
          <span className="text-[#667085] text-xs font-medium block">Reserved Cash</span>
          <span className="text-2xl font-bold font-mono text-[#B7791F] block tracking-tight">
            {formatINR(account?.reservedCashPaise || 0)}
          </span>
          <span className="text-[11px] text-[#667085]">Reserved against active buy orders</span>
        </div>

        {/* Total Realized P&L */}
        <div
          className="bg-white border border-[#E2E8F0] p-4.5 rounded-xl shadow-2xs space-y-1.5"
          title="Cumulative profit or loss calculated from completed sell executions using weighted average cost basis."
        >
          <span className="text-[#667085] text-xs font-medium block">Total Realized P&amp;L</span>
          <span
            className={`text-2xl font-bold font-mono block tracking-tight ${
              (metrics?.totalRealizedPnlPaise || 0) >= 0 ? 'text-[#087F5B]' : 'text-[#D64545]'
            }`}
          >
            {formatINR(metrics?.totalRealizedPnlPaise || 0)}
          </span>
          <span className="text-[11px] text-[#667085]">Cumulative profit/loss from completed sales</span>
        </div>
      </div>

      {/* Holdings & Asset Allocation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Table (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-[#172B4D] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#087F5B]" />
            Active Positions ({positions.length})
          </h2>
          <PositionsTable positions={positions} />
        </div>

        {/* Asset Allocation Chart (1 col) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <h3 className="font-semibold text-[#172B4D] text-xs border-b border-[#E2E8F0] pb-3">
            Asset Value Allocation
          </h3>

          <div className="h-64 my-2">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#94A3B8] text-xs italic">
                No active positions or cash valuation records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Value']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#172B4D',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#667085' }}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] text-[11px] text-[#667085] flex justify-between">
            <span>Positions Count: {positions.length}</span>
            <span className="font-mono text-[#087F5B]">Exact Allocation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
