import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { OrdersTable } from '../features/orders/OrdersTable.jsx';
import { formatINR, formatQuantity } from '../utils/formatters.js';
import {
  Wallet,
  Lock,
  PieChart,
  ListOrdered,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  History,
  Activity,
} from 'lucide-react';

export function DashboardPage() {
  const { user, account } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sumRes, ordRes, instRes] = await Promise.all([
        api.portfolio.getSummary(),
        api.orders.getAll({ limit: 5 }),
        api.instruments.getAll(),
      ]);
      setSummary(sumRes);
      setRecentOrders(ordRes?.orders || []);
      setInstruments(instRes?.instruments || []);
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

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#087F5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview Summary Banner */}
      <div className="bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#E6F4EF] text-[#087F5B] border border-[#A7F3D0] font-mono">
              SIMULATED EXCHANGE
            </span>
            {audit?.isReconciled && (
              <span className="flex items-center gap-1 text-[11px] text-[#087F5B] font-medium bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ledger Reconciled
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#172B4D] mt-1.5 tracking-tight">
            Trading Overview — {user?.name || 'Simulated Trader'}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Monitor account balances, working orders, positions, and recent execution activity.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/terminal"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-semibold transition-all shadow-2xs"
          >
            <span>Open Order Execution Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Account Equity */}
        <div
          className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4.5 rounded-xl shadow-2xs space-y-1"
          title="Total simulated account valuation combining free cash, reserved cash, and marked position values."
        >
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span className="font-medium">Account Equity</span>
            <PieChart className="w-4 h-4 text-[#087F5B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#172B4D] tracking-tight">
            {formatINR(metrics?.totalPortfolioValuePaise || account?.totalCashPaise || 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#667085]">Cash + Marked Equity Holdings</p>
        </div>

        {/* Available Cash */}
        <div
          className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4.5 rounded-xl shadow-2xs space-y-1"
          title="Cash currently available for new buy orders after accounting for existing reservations."
        >
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span className="font-medium">Available Cash</span>
            <Wallet className="w-4 h-4 text-[#087F5B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#087F5B] tracking-tight">
            {formatINR(account?.availableCashPaise || 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#667085]">Unreserved capital ready for orders</p>
        </div>

        {/* Reserved Cash */}
        <div
          className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4.5 rounded-xl shadow-2xs space-y-1"
          title="Cash committed to active buy orders that have not yet been fully executed or cancelled."
        >
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span className="font-medium">Reserved Cash</span>
            <Lock className="w-4 h-4 text-[#B7791F]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#B7791F] tracking-tight">
            {formatINR(account?.reservedCashPaise || 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#667085]">Committed to working buy limit orders</p>
        </div>

        {/* Unrealized P&L */}
        <div
          className="bg-white border border-[#E2E8F0] p-3.5 sm:p-4.5 rounded-xl shadow-2xs space-y-1"
          title="Estimated profit or loss on open positions based on the application's current valuation logic."
        >
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span className="font-medium">Unrealized P&L</span>
            <TrendingUp className="w-4 h-4 text-[#087F5B]" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              (metrics?.totalUnrealizedPnlPaise || 0) >= 0
                ? 'text-[#087F5B]'
                : 'text-[#D64545]'
            }`}
          >
            {formatINR(metrics?.totalUnrealizedPnlPaise || 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#667085]">Marked to current reference prices</p>
        </div>
      </div>

      {/* Market Instruments Overview Table & Mobile Cards */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="font-semibold text-[#172B4D] text-xs sm:text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#087F5B]" />
              Simulated Market Equities ({instruments.length})
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#667085]">
              Simulated equity instruments eligible for order placement and matching.
            </p>
          </div>
          <Link
            to="/terminal"
            className="text-xs text-[#087F5B] hover:text-[#066649] font-medium flex items-center gap-1 shrink-0"
          >
            Place Order
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Equities Card List (< sm) */}
        <div className="sm:hidden space-y-2.5">
          {instruments.map((inst) => (
            <div
              key={inst.symbol}
              className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#172B4D] text-sm block">{inst.symbol}</span>
                  <span className="text-[11px] text-[#667085] truncate block max-w-[170px]">
                    {inst.displayName}
                  </span>
                </div>
                <Link
                  to={`/terminal?symbol=${inst.symbol}`}
                  className="px-3 py-1 rounded-md bg-[#087F5B] text-white text-[11px] font-semibold hover:bg-[#066649] transition-colors"
                >
                  Place Order
                </Link>
              </div>

              <div className="grid grid-cols-2 min-[360px]:grid-cols-3 gap-2 pt-1 border-t border-[#E2E8F0] font-mono text-[11px]">
                <div>
                  <span className="text-[10px] text-[#667085] font-sans block">Last Price</span>
                  <span className="font-bold text-[#172B4D]">
                    {formatINR(inst.lastPricePaise || inst.simulatedReferencePricePaise)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] font-sans block">Ref Price</span>
                  <span className="text-[#667085]">
                    {formatINR(inst.simulatedReferencePricePaise)}
                  </span>
                </div>
                <div className="col-span-2 min-[360px]:col-span-1">
                  <span className="text-[10px] text-[#667085] font-sans block">Day Range</span>
                  <span className="text-[#667085] text-[10px]">
                    {formatINR(inst.dayLowPaise)} - {formatINR(inst.dayHighPaise)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop & Tablet Equities Table (>= sm) */}
        <div className="hidden sm:block overflow-x-auto min-w-0 max-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase text-[10px] font-mono tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Last Price</th>
                <th className="py-2.5 px-3">Ref Price</th>
                <th className="py-2.5 px-3">Day Range</th>
                <th className="py-2.5 px-3">Tick</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
              {instruments.map((inst) => (
                <tr key={inst.symbol} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-[#172B4D] font-sans">
                    {inst.symbol}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[#667085]">
                    {inst.displayName}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#172B4D]">
                    {formatINR(inst.lastPricePaise || inst.simulatedReferencePricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {formatINR(inst.simulatedReferencePricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {formatINR(inst.dayLowPaise)} - {formatINR(inst.dayHighPaise)}
                  </td>
                  <td className="py-2.5 px-3 text-[#667085]">
                    {formatINR(inst.tickSizePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/terminal?symbol=${inst.symbol}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E6F4EF] hover:bg-[#A7F3D0] text-[#087F5B] font-semibold text-[11px] transition-colors"
                    >
                      Place Order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Grid: Holdings Preview & Engine Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Positions Summary (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="font-semibold text-[#172B4D] text-xs sm:text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#087F5B]" />
              Active Positions ({positions.length})
            </h3>
            <Link
              to="/portfolio"
              className="text-xs text-[#087F5B] hover:text-[#066649] font-medium flex items-center gap-1 shrink-0"
            >
              All Positions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center text-[#94A3B8] text-xs italic">
              No open positions. Positions are created when buy orders execute.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] font-mono text-xs">
              {positions.slice(0, 5).map((pos) => (
                <div key={pos.instrument} className="py-2.5 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1.5">
                  <div>
                    <span className="font-bold text-[#172B4D] font-sans block">{pos.instrument}</span>
                    <span className="text-[#667085] text-[11px]">
                      {formatQuantity(pos.ownedQuantity)} shares @ Avg {formatINR(pos.averageCostPricePaise)}
                    </span>
                  </div>
                  <div className="min-[380px]:text-right">
                    <span className="font-semibold text-[#172B4D] block">
                      {formatINR(pos.marketValuePaise)}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        pos.unrealizedPnlPaise >= 0 ? 'text-[#087F5B]' : 'text-[#D64545]'
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
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="font-semibold text-[#172B4D] text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-[#087F5B]" />
              Execution Architecture
            </h3>
            <Link
              to="/activity"
              className="text-xs text-[#087F5B] hover:text-[#066649] font-medium flex items-center gap-1"
            >
              Execution History
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#667085]">Working Orders in Book:</span>
              <span className="font-mono font-bold text-[#087F5B]">
                {metrics?.openOrdersCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#667085]">Filled Orders:</span>
              <span className="font-mono font-bold text-[#172B4D]">
                {metrics?.filledOrdersCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#667085]">Matching Algorithm:</span>
              <span className="font-mono font-medium text-[#172B4D]">Price-Time (FIFO)</span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#667085]">Self-Trade Policy:</span>
              <span className="font-mono font-medium text-[#172B4D]">Prevent Wash Trade</span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#667085]">Accounting Precision:</span>
              <span className="font-mono font-medium text-[#087F5B]">Exact Integer Paise</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#172B4D] text-sm flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#087F5B]" />
            Recent Orders
          </h3>
          <Link
            to="/orders"
            className="text-xs text-[#087F5B] hover:text-[#066649] font-medium flex items-center gap-1"
          >
            Open &amp; Historical Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <OrdersTable orders={recentOrders} onOrderUpdated={loadDashboardData} />
      </div>
    </div>
  );
}
