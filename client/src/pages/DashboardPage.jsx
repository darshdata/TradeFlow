import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { OrdersTable } from '../features/orders/OrdersTable.jsx';
import { formatINR, formatDateTime, formatQuantity } from '../utils/formatters.js';
import {
  Wallet,
  Lock,
  PieChart,
  ListOrdered,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  History,
  Layers,
} from 'lucide-react';

export function DashboardPage() {
  const { user, account } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sumRes, ordRes] = await Promise.all([
        api.portfolio.getSummary(),
        api.orders.getAll({ limit: 5 }),
      ]);
      setSummary(sumRes);
      setRecentOrders(ordRes?.orders || []);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const metrics = summary?.metrics;
  const positions = summary?.positions || [];
  const audit = summary?.audit;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111726] to-[#0f1422] p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-mono">
              SIMULATED TERMINAL
            </span>
            {audit?.isReconciled && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ledger Reconciled
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1">
            Welcome back, {user?.name || 'Trader'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time deterministic order-matching engine with double-entry reservation accounting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/terminal"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors shadow-md shadow-sky-500/20"
          >
            Open Trading Terminal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Marked Portfolio Value */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Portfolio Value</span>
            <PieChart className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {formatINR(metrics?.totalPortfolioValuePaise || account?.totalCashPaise || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Cash + Marked Stock Holdings</p>
        </div>

        {/* Available Cash */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Available Cash</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatINR(account?.availableCashPaise || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Free capital ready for buy orders</p>
        </div>

        {/* Reserved Cash */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Reserved Cash</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {formatINR(account?.reservedCashPaise || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Committed to active resting bids</p>
        </div>

        {/* Unrealized P&L */}
        <div className="bg-[#111622] border border-slate-800 p-4 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Unrealized P&L</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              (metrics?.totalUnrealizedPnlPaise || 0) >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {formatINR(metrics?.totalUnrealizedPnlPaise || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Marked to simulated market prices</p>
        </div>
      </div>

      {/* Main Grid: Holdings Preview & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Summary (2 cols) */}
        <div className="lg:col-span-2 bg-[#111622] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Active Stock Positions ({positions.length})
            </h3>
            <Link
              to="/portfolio"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              View Full Portfolio
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No shares held yet. Submit a BUY order in the Trading Terminal to build your portfolio!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {positions.slice(0, 5).map((pos) => (
                <div key={pos.instrument} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 font-sans block">{pos.instrument}</span>
                    <span className="text-slate-400 text-[11px]">
                      {formatQuantity(pos.ownedQuantity)} shares @ Avg {formatINR(pos.averageCostPricePaise)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-200 block">
                      {formatINR(pos.marketValuePaise)}
                    </span>
                    <span
                      className={`text-[11px] ${
                        pos.unrealizedPnlPaise >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatINR(pos.unrealizedPnlPaise)} ({pos.unrealizedPnlPercentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Engine Activity KPI card */}
        <div className="bg-[#111622] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Engine Stats
            </h3>
            <Link
              to="/activity"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Executions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Open Resting Orders:</span>
              <span className="font-mono font-bold text-sky-400">
                {metrics?.openOrdersCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Filled Orders:</span>
              <span className="font-mono font-bold text-emerald-400">
                {metrics?.filledOrdersCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Matching Priority:</span>
              <span className="font-mono font-medium text-slate-200">Price-Time FIFO</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Self-Trade Policy:</span>
              <span className="font-mono font-medium text-slate-200">Prevent Wash Trade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-sky-400" />
            Recent Order Activity
          </h3>
          <Link
            to="/orders"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            All Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <OrdersTable orders={recentOrders} onOrderUpdated={loadDashboardData} />
      </div>
    </div>
  );
}
