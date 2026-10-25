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
  ArrowRight,
} from 'lucide-react';

export function OrderTicket({ prefilledPrice, onOrderSubmitted }) {
  const { selectedSymbol, selectedInstrument, orderBook, refreshAll } = useTrading();
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
      } catch (err) {
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

    if (!isFormValid) {
      if (hasInsufficientCash) {
        setErrorMessage(`Insufficient cash. Required: ${formatINR(requiredCashPaise)}, Available: ${formatINR(availableCashPaise)}`);
        return;
      }
      if (hasInsufficientShares) {
        setErrorMessage(`Insufficient shares. Required: ${numQty}, Available in portfolio: ${availableShares}`);
        return;
      }
      if (!isTickValid) {
        setErrorMessage(`Price must conform to ${formatINR(selectedInstrument?.tickSizePaise || 5)} tick size.`);
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

      const res = await api.orders.create(payload, idempotencyKey);
      setShowConfirm(false);
      setSuccessResult(res);
      refreshAccount();
      refreshAll();
      if (onOrderSubmitted) onOrderSubmitted(res);
    } catch (err) {
      setErrorMessage(err.message || 'Order submission failed');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111622] border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100 text-xs">Order Ticket</h3>
        <span className="text-[10px] text-slate-400 font-mono">
          Paise Precision: 1 INR = 100 Paise
        </span>
      </div>

      <form onSubmit={handleSubmitClick} className="space-y-4 pt-3 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Side Selector (BUY vs SELL) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setSide('BUY');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                side === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              BUY
            </button>
            <button
              type="button"
              onClick={() => {
                setSide('SELL');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                side === 'SELL'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              SELL
            </button>
          </div>

          {/* Order Type (LIMIT vs MARKET) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`py-1.5 rounded-md font-medium text-xs transition-all ${
                orderType === 'LIMIT'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LIMIT ORDER
            </button>
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`py-1.5 rounded-md font-medium text-xs transition-all ${
                orderType === 'MARKET'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MARKET ORDER
            </button>
          </div>

          {/* Plain language explanation banner */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-lg text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p>
              {orderType === 'LIMIT' ? (
                <>
                  <strong className="text-slate-200">Limit Order:</strong> Specifies your worst acceptable price. It rests on the order book until crossed by opposing liquidity.
                </>
              ) : (
                <>
                  <strong className="text-slate-200">Market Order:</strong> Attempts immediate execution against opposing resting orders. Unfilled remainder is cancelled (IOC policy).
                </>
              )}
            </p>
          </div>

          {/* Limit Price Input (Only for LIMIT) */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <label className="text-slate-300 font-medium">Limit Price (₹)</label>
                <span className="text-slate-400 text-[10px]">
                  Tick: {formatINR(selectedInstrument?.tickSizePaise || 5)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">₹</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* Quantity Input with Presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <label className="text-slate-300 font-medium">Quantity (Shares)</label>
              <div className="flex gap-1">
                {[10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetQty(preset)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-700/60 rounded text-slate-300 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Number of shares"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Accounting Estimates & Invariant Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Est. Notional Value:</span>
              <span className="text-slate-200 font-medium">{formatINR(estimatedNotionalPaise)}</span>
            </div>

            {side === 'BUY' ? (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Required Cash Reservation:</span>
                <span className={`font-medium ${hasInsufficientCash ? 'text-rose-400' : 'text-slate-200'}`}>
                  {formatINR(requiredCashPaise)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Available Shares Owned:</span>
                <span className={`font-medium ${hasInsufficientShares ? 'text-rose-400' : 'text-slate-200'}`}>
                  {formatQuantity(availableShares)} shares
                </span>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px] flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successResult && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-[11px] space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Order Processed: {successResult.order?.status}</span>
              </div>
              <p className="text-[10px] text-emerald-400/90 font-mono">
                Order Ref: {successResult.order?.orderId} | Executions: {successResult.executions?.length || 0}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-2.5 rounded-lg font-semibold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-950/40 disabled:text-emerald-800'
                : 'bg-rose-600 hover:bg-rose-500 text-white disabled:bg-rose-950/40 disabled:text-rose-800'
            }`}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Place {side} {orderType} Order
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title={`Confirm ${side} Order`}
        confirmText={`Confirm & Submit ${side}`}
        isDestructive={side === 'SELL'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmOrder}
        onCancel={() => setShowConfirm(false)}
      >
        <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Instrument:</span>
            <span className="text-slate-200 font-bold">{selectedSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Side & Type:</span>
            <span className={side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
              {side} {orderType}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Quantity:</span>
            <span className="text-slate-200">{formatQuantity(numQty)} shares</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Price:</span>
            <span className="text-slate-200">
              {orderType === 'LIMIT' ? formatINR(numPricePaise) : 'Market Price'}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400 font-sans">Est. Obligation:</span>
            <span className="text-sky-400 font-bold">{formatINR(estimatedNotionalPaise)}</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
