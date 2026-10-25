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
