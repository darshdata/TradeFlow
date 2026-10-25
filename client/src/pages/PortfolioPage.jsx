import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { PositionsTable } from '../features/portfolio/PositionsTable.jsx';
import { formatINR, formatPercentage } from '../utils/formatters.js';
import {
  Briefcase,
  Wallet,
  Lock,
  ShieldCheck,
  CheckCircle,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function PortfolioPage() {
  const [summary, setSummary] = useState(null);

  const fetchPortfolio = async () => {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111622] p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-400" />
            Portfolio Valuations & Position Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Persistent simulated holdings, reservation invariants, and position-level cost basis tracking.
          </p>
        </div>

        {audit?.isReconciled && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Accounting Invariants: Reconciled</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400 text-xs block">Total Portfolio Value</span>
          <span className="text-xl font-bold font-mono text-slate-100 block">
            {formatINR(metrics?.totalPortfolioValuePaise || 0)}
          </span>
          <span className="text-[10px] text-slate-400">Total Cash + Stock Market Values</span>
        </div>

        {/* Free Available Cash */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400 text-xs block">Available Cash</span>
          <span className="text-xl font-bold font-mono text-emerald-400 block">
            {formatINR(account?.availableCashPaise || 0)}
          </span>
          <span className="text-[10px] text-slate-400">Total Cash - Reserved Cash</span>
        </div>

        {/* Total Stock Holdings Value */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400 text-xs block">Stock Holdings Value</span>
          <span className="text-xl font-bold font-mono text-sky-400 block">
            {formatINR(metrics?.totalPositionsMarketValuePaise || 0)}
          </span>
          <span className="text-[10px] text-slate-400">Across {positions.length} instruments</span>
        </div>

        {/* Realized P&L */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400 text-xs block">Realized P&L</span>
          <span
            className={`text-xl font-bold font-mono block ${
              (metrics?.totalRealizedPnlPaise || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatINR(metrics?.totalRealizedPnlPaise || 0)}
          </span>
          <span className="text-[10px] text-slate-400">Locked profits/losses from sells</span>
        </div>
      </div>

      {/* Visual Asset Allocation & Invariant Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation Chart (Recharts) */}
        <div className="lg:col-span-2 bg-[#111622] border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-sky-400" />
            Asset Allocation Breakdown
          </h3>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No asset data to chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#111622',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Ledger Invariant Audit Card */}
        <div className="bg-[#111622] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Accounting Invariant Audit
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Total Cash Balance:</span>
              <span className="font-mono text-slate-200">{formatINR(account?.totalCashPaise || 0)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Active Bid Reservations:</span>
              <span className="font-mono text-amber-400">{formatINR(audit?.sumActiveBuyReservations || 0)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Ledger Reserved Cash:</span>
              <span className="font-mono text-amber-400">{formatINR(account?.reservedCashPaise || 0)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/50 flex items-center gap-2 text-emerald-300 text-[11px]">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Double-entry consistency enforced: Available cash is strictly guarded against negative balances.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Holdings Table */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-sky-400" />
          Stock Holdings Details
        </h3>
        <PositionsTable positions={positions} />
      </div>
    </div>
  );
}
