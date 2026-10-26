import { PAISE_PER_RUPEE } from '../config/constants.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Converts a rupee float/number or numeric string to exact integer paise.
 * Throws if the result exceeds safe integer bounds or is not a finite number.
 */
export function rupeesToPaise(rupees) {
  const num = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new ValidationError(`Invalid rupee value: ${rupees}`);
  }
  const paise = Math.round(num * PAISE_PER_RUPEE);
  if (!Number.isSafeInteger(paise)) {
    throw new ValidationError(`Rupee value exceeds safe integer bounds: ${rupees}`);
  }
  return paise;
}

/**
 * Converts integer paise to rupee floating representation formatted to 2 decimals.
 */
export function paiseToRupees(paise) {
  if (typeof paise !== 'number' || !Number.isSafeInteger(paise)) {
    throw new ValidationError(`Invalid paise integer: ${paise}`);
  }
  return (paise / PAISE_PER_RUPEE).toFixed(2);
}

/**
 * Formats integer paise into standard Indian Rupee currency string, e.g. "₹1,23,456.75"
 */
export function formatINR(paise) {
  if (typeof paise !== 'number' || !Number.isSafeInteger(paise)) {
    return '₹0.00';
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / PAISE_PER_RUPEE);
  const paiseRemainder = absPaise % PAISE_PER_RUPEE;
  const formattedPaise = paiseRemainder.toString().padStart(2, '0');

  // Format integer part in Indian numbering style (e.g., 12,34,567)
  const rupeeStr = rupees.toString();
  let result = '';
  if (rupeeStr.length > 3) {
    const lastThree = rupeeStr.slice(-3);
    const remaining = rupeeStr.slice(0, -3);
    result = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    result = rupeeStr;
  }

  return `${isNegative ? '-' : ''}₹${result}.${formattedPaise}`;
}

/**
 * Calculates notional value in paise: priceInPaise * quantity.
 * Safe integer guaranteed.
 */
export function calculateNotionalPaise(priceInPaise, quantity) {
  if (!Number.isSafeInteger(priceInPaise) || priceInPaise < 0) {
    throw new ValidationError(`Invalid price in paise: ${priceInPaise}`);
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError(`Invalid quantity: ${quantity}`);
  }
  const notional = priceInPaise * quantity;
  if (!Number.isSafeInteger(notional)) {
    throw new ValidationError(`Calculated notional exceeds safe integer bounds`);
  }
  return notional;
}

/**
 * Validates that price conforms to tick size (in paise).
 */
export function validateTickSize(priceInPaise, tickSizeInPaise = 5) {
  if (priceInPaise <= 0) {
    return false;
  }
  return priceInPaise % tickSizeInPaise === 0;
}

/**
 * Calculates execution price improvement refund:
 * (reservedPriceInPaise - actualExecutionPriceInPaise) * executedQuantity
 */
export function calculatePriceImprovementRefund(reservedPriceInPaise, actualPriceInPaise, executedQuantity) {
  if (reservedPriceInPaise <= actualPriceInPaise) return 0;
  const diffPerUnit = reservedPriceInPaise - actualPriceInPaise;
  return calculateNotionalPaise(diffPerUnit, executedQuantity);
}

/**
 * Verifies portfolio ledger invariants across cash, shares, and open order commitments.
 * Checks:
 * 1. Cash and reserved cash are non-negative safe integers.
 * 2. Total cash >= reserved cash (effective buying power / available cash >= 0).
 * 3. Sum of active buy order commitments matches account.reservedCashPaise.
 * 4. Position quantities and reserved shares are non-negative safe integers, with reservedQuantity <= ownedQuantity.
 * 5. Position reserved shares match remaining open sell orders sum for each instrument.
 * 6. No orphaned reserved shares exist for instruments without open sell orders.
 *
 * @param {Object} params
 * @param {Object} params.account - User account record
 * @param {Array} [params.positions=[]] - User position records
 * @param {Array} [params.openOrders=[]] - User active open/partially-filled orders
 * @returns {{ invariantsValid: boolean, discrepancies: string[], details: Object }}
 */
export function verifyPortfolioInvariants({ account, positions = [], openOrders = [] }) {
  const discrepancies = [];

  if (!account) {
    discrepancies.push('Account record not found');
    return {
      invariantsValid: false,
      discrepancies,
      details: {},
    };
  }

  // 1. Account Cash and Reservation Invariants
  const totalCash = account.totalCashPaise ?? 0;
  const reservedCash = account.reservedCashPaise ?? 0;

  if (typeof totalCash !== 'number' || totalCash < 0 || !Number.isSafeInteger(totalCash)) {
    discrepancies.push(`Total cash must be a non-negative safe integer: received ${totalCash}`);
  }
  if (typeof reservedCash !== 'number' || reservedCash < 0 || !Number.isSafeInteger(reservedCash)) {
    discrepancies.push(`Reserved cash must be a non-negative safe integer: received ${reservedCash}`);
  }
  if (totalCash < reservedCash) {
    discrepancies.push(`Reserved cash (${reservedCash} paise) cannot exceed total cash (${totalCash} paise)`);
  }

  // 2. Open Buy Orders Commitment Check
  const openBuyOrders = openOrders.filter((o) => o.side === 'BUY');
  const expectedReservedCashPaise = openBuyOrders.reduce((sum, o) => {
    const remaining = typeof o.remainingQuantity === 'number' ? o.remainingQuantity : 0;
    const price = typeof o.priceInPaise === 'number' ? o.priceInPaise : 0;
    return sum + (price * remaining);
  }, 0);

  if (reservedCash !== expectedReservedCashPaise) {
    discrepancies.push(
      `Reserved cash mismatch: account records ${reservedCash} paise, but active buy orders require ${expectedReservedCashPaise} paise`
    );
  }

  // 3. Position Share Reservations vs Open Sell Orders Check
  const positionMap = new Map();
  for (const pos of positions) {
    const owned = pos.ownedQuantity ?? 0;
    const reserved = pos.reservedQuantity ?? 0;

    if (typeof owned !== 'number' || owned < 0 || !Number.isSafeInteger(owned)) {
      discrepancies.push(`Instrument ${pos.instrument}: owned quantity must be a non-negative safe integer (received ${owned})`);
    }
    if (typeof reserved !== 'number' || reserved < 0 || !Number.isSafeInteger(reserved)) {
      discrepancies.push(`Instrument ${pos.instrument}: reserved quantity must be a non-negative safe integer (received ${reserved})`);
    }
    if (reserved > owned) {
      discrepancies.push(
        `Instrument ${pos.instrument}: reserved quantity (${reserved}) exceeds owned quantity (${owned})`
      );
    }
    positionMap.set(pos.instrument, pos);
  }

  // Sum open sell orders by instrument
  const openSellOrders = openOrders.filter((o) => o.side === 'SELL');
  const sellOrdersByInstrument = new Map();
  for (const order of openSellOrders) {
    const remaining = typeof order.remainingQuantity === 'number' ? order.remainingQuantity : 0;
    const current = sellOrdersByInstrument.get(order.instrument) || 0;
    sellOrdersByInstrument.set(order.instrument, current + remaining);
  }

  // Compare position reserved shares against open sell orders
  for (const [symbol, expectedReservedShares] of sellOrdersByInstrument.entries()) {
    const pos = positionMap.get(symbol);
    const recordedReserved = pos ? (pos.reservedQuantity ?? 0) : 0;
    if (recordedReserved !== expectedReservedShares) {
      discrepancies.push(
        `Instrument ${symbol}: reserved shares (${recordedReserved}) does not match open sell orders sum (${expectedReservedShares})`
      );
    }
  }

  // Check positions with reserved shares where no open sell orders exist
  for (const pos of positions) {
    const reserved = pos.reservedQuantity ?? 0;
    if (reserved > 0 && !sellOrdersByInstrument.has(pos.instrument)) {
      discrepancies.push(
        `Instrument ${pos.instrument}: position has ${reserved} reserved shares but no open sell orders exist`
      );
    }
  }

  return {
    invariantsValid: discrepancies.length === 0,
    discrepancies,
    details: {
      totalCashPaise: totalCash,
      reservedCashPaise: reservedCash,
      availableCashPaise: Math.max(0, totalCash - reservedCash),
      expectedReservedCashPaise,
      openBuyOrdersCount: openBuyOrders.length,
      openSellOrdersCount: openSellOrders.length,
      positionsCheckedCount: positions.length,
    },
  };
}
