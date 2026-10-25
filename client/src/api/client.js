// Centralized API Client for TradeFlow

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('tradeflow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (err) {
    throw new Error('Connection to the trading service was interrupted. Please ensure the service is active and retry.');
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data?.code || 'API_ERROR';
    error.details = data?.details || null;
    throw error;
  }

  return data?.data ?? data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: () => request('/auth/me'),
  },

  instruments: {
    getAll: () => request('/instruments'),
    getBySymbol: (symbol) => request(`/instruments/${symbol}`),
  },

  orders: {
    create: (body, idempotencyKey) =>
      request('/orders', {
        method: 'POST',
        body,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/orders${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/orders/${id}`),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
    getEvents: (id) => request(`/orders/${id}/events`),
  },

  orderbook: {
    getBySymbol: (symbol) => request(`/orderbook/${symbol}`),
  },

  portfolio: {
    getSummary: () => request('/portfolio/summary'),
    getPositions: () => request('/portfolio/positions'),
    getAccount: () => request('/portfolio/account'),
  },

  executions: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/executions${query ? `?${query}` : ''}`);
    },
  },
};
