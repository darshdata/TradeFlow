import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { TrendingUp, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    const demoEmail = 'trader.demo@tradeflow.simulated';
    const demoPassword = 'DemoPassword123!';

    try {
      // Attempt login first
      await login({ email: demoEmail, password: demoPassword });
      navigate('/');
    } catch (err) {
      // If demo user does not exist, auto-register
      try {
        await register({
          name: 'Demo Trader',
          email: demoEmail,
          password: demoPassword,
        });
        navigate('/');
      } catch (regErr) {
        setError(regErr.message || 'Could not initialize demo account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-[#111622] p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold mx-auto shadow-lg shadow-sky-500/20 text-lg">
            TF
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Sign in to TradeFlow
          </h2>
          <p className="text-xs text-slate-400">
            Access your simulated trading terminal, order book, and cash ledger.
          </p>
        </div>

        {/* Quick Demo Login CTA */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-950/80 to-indigo-950/80 hover:from-sky-900/90 hover:to-indigo-900/90 border border-sky-800/80 text-sky-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>Launch One-Click Demo Account (₹1,00,000 Cash)</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-slate-800"></div>
          <span className="shrink mx-3 text-slate-500 text-[10px] uppercase font-mono">Or with credentials</span>
          <div className="grow border-t border-slate-800"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Terminal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-850">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
