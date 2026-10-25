import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR } from '../utils/formatters.js';
import {
  Menu,
  Wallet,
  Lock,
  LogOut,
  Briefcase,
  Activity,
  ChevronDown,
} from 'lucide-react';

const ROUTE_TITLES = {
  '/': 'Workstation Dashboard',
  '/terminal': 'Live Trading Terminal',
  '/orderbook': 'Level 2 Order Book Depth',
  '/orders': 'My Orders & Audit Trail',
  '/portfolio': 'Portfolio & Asset Ledger',
  '/activity': 'Execution Records Blotter',
  '/login': 'Sign In',
  '/register': 'Create Account',
};

export function Header({ onOpenMobile }) {
  const { user, account, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Trading Terminal';

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 -ml-1 rounded-md text-[#667085] hover:text-[#172B4D] hover:bg-[#F1F5F9] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[#172B4D] truncate">
            {currentTitle}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E6F4EF] text-[#087F5B] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B] animate-pulse" />
            FIFO Engine Active
          </span>
        </div>
      </div>

      {/* Right: Cash Balances & User Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Account Balances Pill */}
        {account && (
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 sm:px-3 py-1 rounded-md text-xs">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#087F5B]" />
              <span className="text-[#667085] hidden md:inline">Available:</span>
              <span className="font-mono font-semibold text-[#087F5B]">
                {formatINR(account.availableCashPaise)}
              </span>
            </div>

            {account.reservedCashPaise > 0 && (
              <div className="flex items-center gap-1 text-[#667085] pl-2 border-l border-[#E2E8F0]">
                <Lock className="w-3 h-3 text-[#B7791F]" />
                <span className="text-[#667085] hidden md:inline">Reserved:</span>
                <span className="font-mono font-medium text-[#B7791F]">
                  {formatINR(account.reservedCashPaise)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* User Profile or Auth Buttons */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-md text-xs text-[#172B4D] transition-colors shadow-2xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#E6F4EF] text-[#087F5B] font-bold text-[11px] flex items-center justify-center border border-[#A7F3D0]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium max-w-[100px] sm:max-w-[130px] truncate hidden sm:inline">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#667085]" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 py-1.5 text-xs animate-in fade-in duration-100">
                  <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="font-semibold text-[#172B4D] truncate">{user.name}</p>
                    <p className="text-[#667085] text-[11px] truncate font-mono">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/portfolio"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-[#172B4D] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <Briefcase className="w-4 h-4 text-[#667085]" />
                      <span>My Portfolio</span>
                    </Link>
                    <Link
                      to="/activity"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-[#172B4D] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <Activity className="w-4 h-4 text-[#667085]" />
                      <span>Trade Executions</span>
                    </Link>
                  </div>
                  <div className="border-t border-[#E2E8F0] pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#D64545] hover:bg-[#FEF2F2] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg text-[#172B4D] hover:bg-[#F1F5F9] font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-lg bg-[#087F5B] hover:bg-[#066649] text-white font-medium transition-colors shadow-2xs"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
