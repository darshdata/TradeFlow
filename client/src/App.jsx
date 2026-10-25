import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TradingProvider } from './context/TradingContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] text-[#087F5B]">
        <span className="w-8 h-8 border-2 border-[#087F5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-[#172B4D] antialiased selection:bg-[#E6F4EF] selection:text-[#087F5B] w-full max-w-full overflow-x-hidden">
      {/* Sidebar (Desktop sticky + Mobile drawer) */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full min-h-screen overflow-x-hidden">
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <SimulatedBanner />

        <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 min-w-0 overflow-x-hidden">
          {children}
        </main>

        <footer className="border-t border-[#E2E8F0] bg-white py-3.5 px-4 text-center text-[11px] sm:text-xs text-[#667085] font-mono">
          TradeFlow Simulated Order Execution & Matching Platform • Deterministic Price-Time Priority FIFO Engine
        </footer>
      </div>
    </div>
  );
}

function PublicShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#172B4D] antialiased">
      <SimulatedBanner />
      <header className="h-14 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#087F5B] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
            TF
          </div>
          <span className="font-bold text-[#172B4D] text-sm tracking-tight flex items-center gap-1.5">
            TradeFlow
            <span className="text-[10px] bg-[#E6F4EF] text-[#087F5B] px-1.5 py-0.5 rounded font-mono font-medium border border-[#A7F3D0]">
              TERMINAL
            </span>
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="border-t border-[#E2E8F0] bg-white py-3.5 px-4 text-center text-xs text-[#667085] font-mono">
        TradeFlow Simulated Order Execution & Matching Platform • Integer Paise Precision
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TradingProvider>
          <Routes>
            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicShell>
                  <LoginPage />
                </PublicShell>
              }
            />
            <Route
              path="/register"
              element={
                <PublicShell>
                  <RegisterPage />
                </PublicShell>
              }
            />

            {/* Authenticated Trading Terminal Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/terminal"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <TradingPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orderbook"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <OrderBookPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <OrdersPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PortfolioPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ActivityPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TradingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
