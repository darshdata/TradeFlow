import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import {
  formatINR,
  paiseToRupees,
  rupeesToPaise,
  formatQuantity,
} from '../../utils/formatters.js';
import {
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  CheckCircle,
  Wallet,
  Briefcase,
  Layers,
  Zap,
  Clock,
} from 'lucide-react';

export function OrderTicket({ prefilledPrice, onOrderSubmitted }) {
  const {
    selectedSymbol,
    selectedInstrument,
    orderBook,
    refreshAll,
    isExtendedSimulation,
    setExtendedSimulation,
    marketStatus,
    canTrade,
    setMarketModalOpen,
  } = useTrading();
  const { account, refreshAccount } = useAuth();

  const [side, setSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [orderType, setOrderType] = useState('LIMIT'); // 'LIMIT' | 'MARKET'
  const [quantity, setQuantity] = useState('10');
  const [limitPrice, setLimitPrice] = useState('');
  const [userPosition, setUserPosition] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Set initial price to reference or last price
  useEffect(() => {
    if (selectedInstrument && !limitPrice) {
      const price = selectedInstrument.lastPricePaise || selectedInstrument.simulatedReferencePricePaise;
      setLimitPrice(paiseToRupees(price));
    }
  }, [selectedInstrument]);

  // When prefilledPrice changes (from clicking orderbook level)
  useEffect(() => {
    if (prefilledPrice) {
      setLimitPrice(prefilledPrice);
      setOrderType('LIMIT');
    }
  }, [prefilledPrice]);

  // Fetch user position for the selected instrument
  useEffect(() => {
    let isMounted = true;
    const fetchPos = async () => {
      try {
        const res = await api.portfolio.getPositions();
        if (isMounted && res?.positions) {
          const match = res.positions.find((p) => p.instrument === selectedSymbol);
          setUserPosition(match || null);
        }
      } catch {
        // ignore
      }
    };
    fetchPos();
    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, successResult]);

  // Calculations
  const numQty = parseInt(quantity, 10) || 0;
  const numPricePaise = orderType === 'LIMIT'
    ? rupeesToPaise(limitPrice)
    : (orderBook?.bestAsk?.priceInPaise || selectedInstrument?.simulatedReferencePricePaise || 0);

  const estimatedNotionalPaise = numQty > 0 ? numPricePaise * numQty : 0;

  // Reservation estimates
  const requiredCashPaise = side === 'BUY'
    ? (orderType === 'LIMIT' ? estimatedNotionalPaise : Math.round(estimatedNotionalPaise * 1.05))
    : 0;
  const availableCashPaise = account?.availableCashPaise || 0;
  const availableShares = userPosition?.availableQuantity || 0;

  // Inline Validation
  const hasInsufficientCash = side === 'BUY' && requiredCashPaise > availableCashPaise;
  const hasInsufficientShares = side === 'SELL' && numQty > availableShares;
  const isTickValid = orderType === 'MARKET' || (numPricePaise > 0 && numPricePaise % (selectedInstrument?.tickSizePaise || 5) === 0);

  const isFormValid =
    numQty > 0 &&
    (orderType === 'MARKET' || (numPricePaise > 0 && isTickValid)) &&
    !hasInsufficientCash &&
    !hasInsufficientShares;

  const handlePresetQty = (qty) => {
    setQuantity(qty.toString());
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);

    if (!canTrade) {
      setErrorMessage(
        'Regular equity exchange is currently closed (09:15 – 15:30 IST). Enable 24/7 Extended Simulation Mode below to execute orders immediately.'
      );
      return;
    }

    if (!isFormValid) {
      if (hasInsufficientCash) {
        setErrorMessage('Insufficient available cash to reserve the required amount for this order.');
        return;
      }
      if (hasInsufficientShares) {
        setErrorMessage('Insufficient available quantity. Some shares may already be reserved by another active sell order.');
        return;
      }
      if (!isTickValid) {
        setErrorMessage("Enter a valid limit price that satisfies the instrument's price and tick-size rules.");
        return;
      }
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `ORD_CLI_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const payload = {
        instrument: selectedSymbol,
        side,
        orderType,
        priceInPaise: orderType === 'LIMIT' ? numPricePaise : 0,
        quantity: numQty,
      };

      const res = await api.orders.create(payload, idempotencyKey, !isExtendedSimulation);
      setShowConfirm(false);
      setSuccessResult(res);
      refreshAccount();
      refreshAll();
      if (onOrderSubmitted) onOrderSubmitted(res);
    } catch (err) {
      setErrorMessage(err.message || 'Order submission could not be completed. Please retry.');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 flex flex-col h-full shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <h3 className="font-semibold text-[#172B4D] text-xs flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#087F5B]" />
          Order Ticket ({selectedSymbol})
        </h3>
        <span className="text-[10px] text-[#667085] font-mono">
          Paise Math (1 INR = 100 Paise)
        </span>
      </div>

      <form onSubmit={handleSubmitClick} className="space-y-4 pt-3 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Side Selector (BUY vs SELL) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg">
            <button
              type="button"
              onClick={() => {
                setSide('BUY');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                side === 'BUY'
                  ? 'bg-[#087F5B] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#172B4D]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Buy {selectedSymbol}
            </button>
            <button
              type="button"
              onClick={() => {
                setSide('SELL');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                side === 'SELL'
                  ? 'bg-[#D64545] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#172B4D]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Sell {selectedSymbol}
            </button>
          </div>

          {/* Order Type (LIMIT vs MARKET) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#667085] w-20">Order Type:</span>
            <div className="flex-1 grid grid-cols-2 gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`py-1 rounded text-xs font-medium transition-all ${
                  orderType === 'LIMIT'
                    ? 'bg-white text-[#172B4D] font-semibold shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#667085] hover:text-[#172B4D]'
                }`}
              >
                Limit
              </button>
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-1 rounded text-xs font-medium transition-all ${
                  orderType === 'MARKET'
                    ? 'bg-white text-[#172B4D] font-semibold shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#667085] hover:text-[#172B4D]'
                }`}
              >
                Market (IOC)
              </button>
            </div>
          </div>

          {/* Limit Price Input */}
          {orderType === 'LIMIT' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[#667085] font-medium">Limit Price (₹)</label>
                <span className="text-[10px] text-[#667085] font-mono">
                  Tick Size: {formatINR(selectedInstrument?.tickSizePaise || 5)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-[#667085] font-mono">₹</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className={`w-full bg-white border rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-[#172B4D] focus:outline-hidden focus:ring-1 ${
                    !isTickValid
                      ? 'border-[#D64545] focus:ring-[#D64545]'
                      : 'border-[#CBD5E1] focus:border-[#087F5B] focus:ring-[#087F5B]'
                  }`}
                  required
                />
              </div>
              {!isTickValid && (
                <p className="text-[10px] text-[#D64545] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Price must align with {formatINR(selectedInstrument?.tickSizePaise || 5)} tick increments.
                </p>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs text-[#667085] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Market orders execute immediately against the opposing resting liquidity book. Any unfilled quantity is immediately cancelled (IOC policy).
              </p>
            </div>
          )}

          {/* Quantity Input with Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[#667085] font-medium">Quantity (Shares)</label>
              {side === 'SELL' && (
                <span className="text-[11px] text-[#667085]">
                  Holding: <strong className="font-mono text-[#172B4D]">{availableShares}</strong>
                </span>
              )}
            </div>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Shares"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-[#172B4D] focus:outline-hidden focus:ring-1 ${
                hasInsufficientShares
                  ? 'border-[#D64545] focus:ring-[#D64545]'
                  : 'border-[#CBD5E1] focus:border-[#087F5B] focus:ring-[#087F5B]'
              }`}
              required
            />
            {/* Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetQty(preset)}
                  className={`flex-1 py-1 rounded text-[11px] font-mono border transition-colors ${
                    numQty === preset
                      ? 'bg-[#E6F4EF] text-[#087F5B] border-[#A7F3D0] font-semibold'
                      : 'bg-white text-[#667085] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Balances & Financial Reservation Breakdown */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#667085]">Estimated Order Value:</span>
              <span className="font-mono font-semibold text-[#172B4D]">
                {formatINR(estimatedNotionalPaise)}
              </span>
            </div>

            {side === 'BUY' ? (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085] flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-[#087F5B]" />
                    Cash Reservation Required:
                  </span>
                  <span className="font-mono font-semibold text-[#087F5B]">
                    {formatINR(requiredCashPaise)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#667085]">Available Cash:</span>
                  <span className={`font-mono ${hasInsufficientCash ? 'text-[#D64545] font-bold' : 'text-[#667085]'}`}>
                    {formatINR(availableCashPaise)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E2E8F0]">
                <span className="text-[#667085] flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#D64545]" />
                  Available Quantity:
                </span>
                <span className={`font-mono ${hasInsufficientShares ? 'text-[#D64545] font-bold' : 'text-[#667085]'}`}>
                  {formatQuantity(availableShares)} shares
                </span>
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {errorMessage && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#D64545] shrink-0 mt-0.5" />
              <p className="leading-tight">{errorMessage}</p>
            </div>
          )}

          {/* Success Result */}
          {successResult && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#166534] space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-semibold text-[#087F5B]">
                <CheckCircle className="w-4 h-4" />
                <span>Order accepted. It is now eligible for matching.</span>
              </div>
              <div className="text-[11px] text-[#166534] font-mono">
                Order ID: {successResult.order?.orderId} • Status: {successResult.order?.status} • Filled: {formatQuantity(successResult.order?.filledQuantity)}/
                {formatQuantity(successResult.order?.quantity)} shares
              </div>
              {successResult.executions?.length > 0 && (
                <div className="text-[10px] text-[#087F5B] pt-1 border-t border-[#BBF7D0]">
                  Matched {successResult.executions.length} execution(s) at average price {formatINR(successResult.order?.averageExecutionPriceInPaise)}
                </div>
              )}
            </div>
          )}
          {/* Market Status & Interview Mode Indicator */}
          {!canTrade ? (
            <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl text-[#B45309] text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-semibold">
                <Clock className="w-4 h-4 shrink-0 text-[#B45309]" />
                <span>Exchange is Closed ({marketStatus?.regularHours})</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#92400E]">
                Enforcing strict exchange hours. Enable 24/7 Extended Simulation to place and match orders immediately during your interview.
              </p>
              <button
                type="button"
                onClick={() => setExtendedSimulation(true)}
                className="w-full py-1.5 px-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                Enable 24/7 Extended Mode to Trade
              </button>
            </div>
          ) : isExtendedSimulation ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#E6F4EF] border border-[#A7F3D0] text-[#087F5B] text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5" />
                24/7 Extended Simulation (Interview Mode Active)
              </span>
              <button
                type="button"
                onClick={() => setMarketModalOpen(true)}
                className="text-[10px] underline hover:text-[#066649] font-mono"
              >
                Schedule
              </button>
            </div>
          ) : null}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || !canTrade}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-2 ${
            !isFormValid || isSubmitting || !canTrade
              ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              : side === 'BUY'
              ? 'bg-[#087F5B] hover:bg-[#066649] text-white'
              : 'bg-[#D64545] hover:bg-[#B91C1C] text-white'
          }`}
        >
          {isSubmitting && (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          <span>
            {isSubmitting
              ? 'Submitting order…'
              : !canTrade
              ? 'Exchange Closed (Strict Mode)'
              : side === 'BUY'
              ? 'Place Buy Order'
              : 'Place Sell Order'}
          </span>
        </button>
      </form>

      {/* Review Order Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title={side === 'BUY' ? 'Review Buy Order' : 'Review Sell Order'}
        message={side === 'BUY' ? 'Review your buy order before submission.' : 'Review your sell order before submission.'}
        confirmText={side === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}
        isDestructive={side === 'SELL'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmOrder}
        onCancel={() => setShowConfirm(false)}
      >
        <div className="space-y-2 font-mono text-xs text-[#172B4D]">
          <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
            <span className="text-[#667085] font-sans">Instrument:</span>
            <span className="font-bold">{selectedSymbol}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
            <span className="text-[#667085] font-sans">Side &amp; Type:</span>
            <span className={side === 'BUY' ? 'text-[#087F5B] font-bold' : 'text-[#D64545] font-bold'}>
              {side} {orderType}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
            <span className="text-[#667085] font-sans">Quantity:</span>
            <span>{formatQuantity(numQty)} shares</span>
          </div>
          {orderType === 'LIMIT' && (
            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
              <span className="text-[#667085] font-sans">Limit Price:</span>
              <span>{formatINR(numPricePaise)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 text-sm font-bold text-[#172B4D] pt-1">
            <span className="font-sans">Estimated Order Value:</span>
            <span className={side === 'BUY' ? 'text-[#087F5B]' : 'text-[#D64545]'}>
              {formatINR(estimatedNotionalPaise)}
            </span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
