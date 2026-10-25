import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { getClientMarketStatus } from '../utils/marketHours.js';

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [instruments, setInstruments] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [orderBook, setOrderBook] = useState(null);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [loadingOrderBook, setLoadingOrderBook] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Market Hours & 24/7 Extended Simulation (Interview Mode) State
  const [isExtendedSimulation, setIsExtendedSimulationState] = useState(() => {
    const saved = localStorage.getItem('tradeflow_extended_simulation');
    return saved !== 'false'; // Defaults to true (24/7 matching enabled for interview demos)
  });

  const [marketStatus, setMarketStatus] = useState(() => getClientMarketStatus());
  const [marketModalOpen, setMarketModalOpen] = useState(false);

  const setExtendedSimulation = (val) => {
    setIsExtendedSimulationState(val);
    localStorage.setItem('tradeflow_extended_simulation', val ? 'true' : 'false');
  };

  const toggleExtendedSimulation = () => {
    setExtendedSimulation(!isExtendedSimulation);
  };

  // Clock tick every 5 seconds to update IST market status
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketStatus(getClientMarketStatus());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const refreshAll = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Fetch instruments list
  useEffect(() => {
    let isMounted = true;
    const fetchInstruments = async () => {
      try {
        const data = await api.instruments.getAll();
        if (isMounted && data?.instruments) {
          setInstruments(data.instruments);
          if (data.instruments.length > 0 && !selectedSymbol) {
            setSelectedSymbol(data.instruments[0].symbol);
          }
        }
      } catch (err) {
        console.error('Failed to load instruments', err);
      } finally {
        if (isMounted) setLoadingInstruments(false);
      }
    };

    fetchInstruments();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch order book for selected instrument and poll periodically
  useEffect(() => {
    if (!selectedSymbol) return;
    let isMounted = true;

    const fetchOrderBook = async () => {
      try {
        const data = await api.orderbook.getBySymbol(selectedSymbol);
        if (isMounted && data) {
          setOrderBook(data);
        }
      } catch (err) {
        console.error('Failed to load order book', err);
      } finally {
        if (isMounted) setLoadingOrderBook(false);
      }
    };

    fetchOrderBook();

    // 3-second polling interval for real-time order book update
    const interval = setInterval(fetchOrderBook, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, refreshCounter]);

  const selectedInstrument = instruments.find((i) => i.symbol === selectedSymbol) || null;

  return (
    <TradingContext.Provider
      value={{
        instruments,
        selectedSymbol,
        setSelectedSymbol,
        selectedInstrument,
        orderBook,
        loadingInstruments,
        loadingOrderBook,
        refreshAll,
        isExtendedSimulation,
        setExtendedSimulation,
        toggleExtendedSimulation,
        marketStatus,
        canTrade: isExtendedSimulation || !!marketStatus?.isRegularOpen,
        marketModalOpen,
        setMarketModalOpen,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
