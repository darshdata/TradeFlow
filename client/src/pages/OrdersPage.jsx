import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { OrdersTable } from '../features/orders/OrdersTable.jsx';
import { ListOrdered, Filter, RefreshCw } from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'OPEN', label: 'Open' },
  { id: 'PARTIALLY_FILLED', label: 'Partially Filled' },
  { id: 'FILLED', label: 'Filled' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'REJECTED', label: 'Rejected' },
];

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 20,
      };
      if (activeTab !== 'ALL') params.status = activeTab;
      if (instrumentFilter) params.instrument = instrumentFilter;

      const res = await api.orders.getAll(params);
      if (res?.orders) {
        setOrders(res.orders);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, instrumentFilter, pagination.page]);

  return (
    <div className="space-y-5">
      {/* Header and status tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111622] p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-sky-400" />
            My Orders & Lifecycle Audit
          </h1>
          <p className="text-xs text-slate-400">
            Real-time tracking of order submissions, cancellations, and execution matches.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Orders
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Instrument filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by symbol (e.g. RELIANCE)"
            value={instrumentFilter}
            onChange={(e) => {
              setInstrumentFilter(e.target.value.toUpperCase());
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable orders={orders} onOrderUpdated={fetchOrders} />

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400 font-mono">
          <span>
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
