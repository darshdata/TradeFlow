import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Briefcase,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/terminal', label: 'Trading', icon: TrendingUp },
  { to: '/orderbook', label: 'Order Book', icon: Layers },
  { to: '/orders', label: 'My Orders', icon: ListOrdered },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/activity', label: 'Executions', icon: History },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const location = useLocation();

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
      {NAV_LINKS.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.to;

        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => {
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            title={collapsed && !isMobile ? link.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-[#E6F4EF] text-[#087F5B] font-semibold shadow-xs'
                : 'text-[#667085] hover:text-[#172B4D] hover:bg-[#F8FAFC]'
            } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-[#087F5B]' : 'text-[#667085]'
              }`}
            />
            {(!collapsed || isMobile) && (
              <span className="truncate">{link.label}</span>
            )}
            {isActive && (!collapsed || isMobile) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#087F5B]" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[#E2E8F0] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Mobile Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#E2E8F0]">
              <Link
                to="/"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[#087F5B] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  TF
                </div>
                <div>
                  <span className="font-bold text-[#172B4D] text-sm tracking-tight flex items-center gap-1.5">
                    TradeFlow
                    <span className="text-[10px] bg-[#E6F4EF] text-[#087F5B] px-1.5 py-0.5 rounded font-mono font-medium border border-[#A7F3D0]">
                      TERMINAL
                    </span>
                  </span>
                </div>
              </Link>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-md text-[#667085] hover:text-[#172B4D] hover:bg-[#F1F5F9] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            {renderNavLinks(true)}

            {/* Mobile Footer Meta */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#667085]">
              <div className="flex items-center gap-2 text-[#087F5B] font-medium mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Deterministic FIFO Engine</span>
              </div>
              <p className="text-[10px] text-[#94A3B8]">
                Integer Paise Precision • Simulated Exchange
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 shrink-0 sticky top-0 h-screen z-30 ${
          collapsed ? 'w-18' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#E2E8F0]">
          <Link
            to="/"
            className={`flex items-center gap-2.5 ${
              collapsed ? 'mx-auto' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#087F5B] flex items-center justify-center text-white font-bold text-xs shadow-xs">
              TF
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-[#172B4D] text-sm tracking-tight flex items-center gap-1.5">
                  TradeFlow
                  <span className="text-[9px] bg-[#E6F4EF] text-[#087F5B] px-1.5 py-0.2 rounded font-mono font-semibold border border-[#A7F3D0]">
                    TERMINAL
                  </span>
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        {renderNavLinks(false)}

        {/* Desktop Collapse Toggle at Bottom */}
        <div className="p-3 border-t border-[#E2E8F0] bg-white">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#667085] hover:text-[#172B4D] hover:bg-[#F8FAFC] transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-[#667085]" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-[#667085]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
