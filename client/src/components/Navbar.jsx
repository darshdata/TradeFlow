import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR } from '../utils/formatters.js';
import {
  TrendingUp,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Briefcase,
  History,
  LogOut,
  Wallet,
  Lock,
} from 'lucide-react';

export function Navbar() {
  const { user, account, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Trading Overview', icon: LayoutDashboard },
    { to: '/terminal', label: 'Order Execution', icon: TrendingUp },
    { to: '/orderbook', label: 'Market Depth', icon: Layers },
    { to: '/orders', label: 'Orders & Execution', icon: ListOrdered },
    { to: '/portfolio', label: 'Positions', icon: Briefcase },
    { to: '/activity', label: 'Execution History', icon: History },
  ];

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#087F5B] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                TF
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#172B4D] tracking-tight text-sm flex items-center gap-1.5">
                  TradeFlow
                  <span className="text-[10px] bg-[#E6F4EF] text-[#087F5B] px-1.5 py-0.5 rounded font-mono font-medium border border-[#A7F3D0]">
                    SIM
                  </span>
                </span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#E6F4EF] text-[#087F5B] font-semibold border border-[#A7F3D0]'
                        : 'text-[#667085] hover:text-[#172B4D] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section: Balance pills & User Profile */}
          <div className="flex items-center gap-3">
            {account && (
              <div className="hidden sm:flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 rounded-md text-xs">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#087F5B]" />
                  <span className="text-[#667085]">Avail:</span>
                  <span className="font-mono font-semibold text-[#087F5B]">
                    {formatINR(account.availableCashPaise)}
                  </span>
                </div>
                {account.reservedCashPaise > 0 && (
                  <div className="flex items-center gap-1 text-[#667085] pl-2 border-l border-[#E2E8F0]">
                    <Lock className="w-3 h-3 text-[#B7791F]" />
                    <span className="font-mono text-[#B7791F]">
                      {formatINR(account.reservedCashPaise)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-md text-xs text-[#172B4D] transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-[#E6F4EF] text-[#087F5B] flex items-center justify-center font-bold text-[10px] border border-[#A7F3D0]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium max-w-[120px] truncate">{user.name}</span>
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 py-1 text-xs">
                      <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        <p className="font-semibold text-[#172B4D]">{user.name}</p>
                        <p className="text-[#667085] text-[11px] truncate font-mono">{user.email}</p>
                      </div>
                      <Link
                        to="/portfolio"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[#172B4D] hover:bg-[#F8FAFC]"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-[#667085]" />
                        Positions
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[#D64545] hover:bg-[#FEE2E2] text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-[#172B4D] hover:bg-[#F1F5F9] transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-[#087F5B] hover:bg-[#066649] text-white font-medium transition-colors shadow-2xs"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
