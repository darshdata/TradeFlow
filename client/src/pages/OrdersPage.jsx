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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#087F5B]" />
            My Orders & Lifecycle Audit
          </h1>
          <p className="text-xs text-[#667085]">
            Real-time tracking of order submissions, cancellations, and execution matches.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#172B4D] hover:bg-[#F8FAFC] text-xs font-medium transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 no-scrollbar shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#E6F4EF] text-[#087F5B] font-semibold border border-[#A7F3D0]'
                  : 'text-[#667085] hover:text-[#172B4D] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Instrument filter */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#667085] shrink-0" />
          <input
            type="text"
            placeholder="Filter by symbol (e.g. RELIANCE)"
            value={instrumentFilter}
            onChange={(e) => {
              setInstrumentFilter(e.target.value.toUpperCase());
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full sm:w-56 bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] font-mono placeholder-[#94A3B8] focus:outline-hidden focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]"
          />
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable orders={orders} onOrderUpdated={fetchOrders} />
    </div>
  );
}
