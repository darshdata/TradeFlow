import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tradeflow_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      const data = await api.auth.getMe();
      setUser(data.user);
      setAccount(data.account);
      setError(null);
    } catch (err) {
      // Clear token if invalid
      localStorage.removeItem('tradeflow_token');
      setToken(null);
      setUser(null);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials) => {
    setError(null);
    try {
      const data = await api.auth.login(credentials);
      localStorage.setItem('tradeflow_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAccount(data.account);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const data = await api.auth.register(userData);
      localStorage.setItem('tradeflow_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAccount(data.account);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('tradeflow_token');
      setToken(null);
      setUser(null);
      setAccount(null);
    }
  };

  const refreshAccount = async () => {
    if (!token) return;
    try {
      const data = await api.portfolio.getAccount();
      if (data?.account) {
        setAccount(data.account);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        token,
        loading,
        error,
        login,
        register,
        logout,
        refreshAccount,
        fetchProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
