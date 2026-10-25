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
  User,
  Wallet,
  Lock,
} from 'lucide-react';

export function Navbar() {
  const { user, account, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/terminal', label: 'Trading', icon: TrendingUp },
    { to: '/orderbook', label: 'Order Book', icon: Layers },
    { to: '/orders', label: 'My Orders', icon: ListOrdered },
    { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { to: '/activity', label: 'Executions', icon: History },
  ];

  return (
    <header className="bg-[#0e131f] border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-sky-500/20">
                TF
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 tracking-tight text-base flex items-center gap-1.5">
                  TradeFlow
                  <span className="text-[10px] bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 border border-slate-700/60 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
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
              <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-md text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Avail:</span>
                  <span className="font-mono font-medium text-emerald-400">
                    {formatINR(account.availableCashPaise)}
                  </span>
                </div>
                {account.reservedCashPaise > 0 && (
                  <div className="flex items-center gap-1 text-slate-400 pl-2 border-l border-slate-700/80">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span className="font-mono text-amber-400">
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
                  className="flex items-center gap-2 bg-slate-800/70 hover:bg-slate-850 border border-slate-700/80 px-2.5 py-1 rounded-md text-xs text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center font-bold text-[10px] border border-sky-800/60">
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
                    <div className="absolute right-0 mt-1.5 w-48 bg-[#121826] border border-slate-800 rounded-lg shadow-xl z-50 py-1 text-xs">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="font-medium text-slate-200">{user.name}</p>
                        <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/portfolio"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800/60"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        My Portfolio
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-950/20 text-left"
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
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium transition-colors shadow-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
