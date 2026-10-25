import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TradingProvider } from './context/TradingContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { SimulatedBanner } from './components/SimulatedBanner.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { TradingPage } from './pages/TradingPage.jsx';
import { OrderBookPage } from './pages/OrderBookPage.jsx';
import { OrdersPage } from './pages/OrdersPage.jsx';
import { PortfolioPage } from './pages/PortfolioPage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090c15] text-slate-400">
        <span className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TradingProvider>
          <div className="min-h-screen flex flex-col bg-[#090c15] text-slate-100 antialiased selection:bg-sky-500/20 selection:text-sky-300">
            <SimulatedBanner />
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                {/* Public Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Authenticated Trading Terminal Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terminal"
                  element={
                    <ProtectedRoute>
                      <TradingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orderbook"
                  element={
                    <ProtectedRoute>
                      <OrderBookPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/portfolio"
                  element={
                    <ProtectedRoute>
                      <PortfolioPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/activity"
                  element={
                    <ProtectedRoute>
                      <ActivityPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-800/80 bg-[#0c101a] py-4 text-center text-xs text-slate-500 font-mono">
              TradeFlow Simulated Order Execution & Matching Platform • Deterministic Price-Time Priority FIFO Engine
            </footer>
          </div>
        </TradingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
