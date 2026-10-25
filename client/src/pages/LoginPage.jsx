import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

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
    } catch {
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
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#087F5B] flex items-center justify-center text-white font-bold mx-auto shadow-2xs text-lg">
            TF
          </div>
          <h2 className="text-xl font-bold text-[#172B4D] tracking-tight">
            Sign in to TradeFlow
          </h2>
          <p className="text-xs text-[#667085]">
            Access your simulated trading terminal, order book, and cash ledger.
          </p>
        </div>

        {/* Quick Demo Login CTA */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E6F4EF] hover:bg-[#A7F3D0] border border-[#A7F3D0] text-[#087F5B] text-xs font-semibold transition-all shadow-2xs"
        >
          <Sparkles className="w-4 h-4 text-[#087F5B]" />
          <span>Launch One-Click Demo Account (₹1,00,000 Cash)</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#E2E8F0]"></div>
          <span className="shrink mx-3 text-[#94A3B8] text-[11px] uppercase font-mono">
            or sign in with credentials
          </span>
          <div className="flex-grow border-t border-[#E2E8F0]"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#172B4D]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#172B4D]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#087F5B] hover:bg-[#066649] text-white text-xs font-semibold transition-all shadow-2xs"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#667085] pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#087F5B] hover:text-[#066649] font-medium">
            Register for free
          </Link>
        </div>
      </div>
    </div>
  );
}
