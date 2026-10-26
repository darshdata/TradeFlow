import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  calculateNotionalPaise,
  validateTickSize,
  calculatePriceImprovementRefund,
  verifyPortfolioInvariants,
} from '../src/engine/financial.js';
import { ValidationError } from '../src/utils/errors.js';

describe('Financial Utilities & Integer Paise Arithmetic', () => {
  describe('rupeesToPaise', () => {
    it('converts standard rupee amounts to exact integer paise', () => {
      expect(rupeesToPaise(100)).toBe(10000);
      expect(rupeesToPaise(2500.5)).toBe(250050);
      expect(rupeesToPaise('1450.75')).toBe(145075);
      expect(rupeesToPaise(0.05)).toBe(5);
    });

    it('rejects invalid or non-numeric values', () => {
      expect(() => rupeesToPaise('abc')).toThrow(ValidationError);
      expect(() => rupeesToPaise(NaN)).toThrow(ValidationError);
      expect(() => rupeesToPaise(Infinity)).toThrow(ValidationError);
    });
  });

  describe('paiseToRupees', () => {
    it('converts paise to 2-decimal rupee string', () => {
      expect(paiseToRupees(10000)).toBe('100.00');
      expect(paiseToRupees(250050)).toBe('2500.50');
      expect(paiseToRupees(5)).toBe('0.05');
      expect(paiseToRupees(0)).toBe('0.00');
    });

    it('throws on non-safe integers', () => {
      expect(() => paiseToRupees(10.5)).toThrow(ValidationError);
      expect(() => paiseToRupees('100')).toThrow(ValidationError);
    });
  });

  describe('formatINR', () => {
    it('formats paise into standard Indian numbering currency format', () => {
      expect(formatINR(10000)).toBe('₹100.00');
      expect(formatINR(12345675)).toBe('₹1,23,456.75');
      expect(formatINR(10000000)).toBe('₹1,00,000.00');
      expect(formatINR(-50000)).toBe('-₹500.00');
    });
  });

  describe('calculateNotionalPaise', () => {
    it('calculates price * quantity in paise safely', () => {
      expect(calculateNotionalPaise(250000, 10)).toBe(2500000);
      expect(calculateNotionalPaise(1000, 1)).toBe(1000);
    });

    it('rejects zero or negative quantities', () => {
      expect(() => calculateNotionalPaise(250000, 0)).toThrow(ValidationError);
      expect(() => calculateNotionalPaise(250000, -5)).toThrow(ValidationError);
    });

    it('rejects negative prices', () => {
      expect(() => calculateNotionalPaise(-100, 5)).toThrow(ValidationError);
    });
  });

  describe('validateTickSize', () => {
    it('validates 5-paise tick rule', () => {
      expect(validateTickSize(250050, 5)).toBe(true);
      expect(validateTickSize(250055, 5)).toBe(true);
      expect(validateTickSize(250052, 5)).toBe(false);
      expect(validateTickSize(0, 5)).toBe(false);
    });
  });

  describe('calculatePriceImprovementRefund', () => {
    it('refunds difference when executed at better price', () => {
      // Reserved at 2500 limit, executed at 2400 for 10 shares => (2500 - 2400) * 10 = 1000
      const refund = calculatePriceImprovementRefund(250000, 240000, 10);
      expect(refund).toBe(100000);
    });

    it('returns 0 when executed at exact reserved price or worse', () => {
      expect(calculatePriceImprovementRefund(250000, 250000, 10)).toBe(0);
      expect(calculatePriceImprovementRefund(240000, 250000, 10)).toBe(0);
    });
  });

  describe('verifyPortfolioInvariants', () => {
    it('returns valid when cash, positions, and open orders invariants hold', () => {
      const account = { totalCashPaise: 1000000, reservedCashPaise: 250000 };
      const positions = [
        { instrument: 'RELIANCE', ownedQuantity: 50, reservedQuantity: 10 },
      ];
      const openOrders = [
        { side: 'BUY', instrument: 'TCS', priceInPaise: 25000, remainingQuantity: 10 },
        { side: 'SELL', instrument: 'RELIANCE', priceInPaise: 260000, remainingQuantity: 10 },
      ];

      const result = verifyPortfolioInvariants({ account, positions, openOrders });
      expect(result.invariantsValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.details.expectedReservedCashPaise).toBe(250000);
      expect(result.details.availableCashPaise).toBe(750000);
    });

    it('identifies discrepancies if reserved cash exceeds total cash', () => {
      const account = { totalCashPaise: 100000, reservedCashPaise: 150000 };
      const result = verifyPortfolioInvariants({ account, positions: [], openOrders: [] });
      expect(result.invariantsValid).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('cannot exceed total cash'))).toBe(true);
    });

    it('identifies discrepancies if buy order commitments do not match reserved cash', () => {
      const account = { totalCashPaise: 1000000, reservedCashPaise: 300000 };
      const openOrders = [
        { side: 'BUY', instrument: 'INFY', priceInPaise: 150000, remainingQuantity: 1 },
      ];
      const result = verifyPortfolioInvariants({ account, positions: [], openOrders });
      expect(result.invariantsValid).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('Reserved cash mismatch'))).toBe(true);
    });

    it('identifies discrepancies if position reserved quantity does not match open sell orders', () => {
      const account = { totalCashPaise: 1000000, reservedCashPaise: 0 };
      const positions = [
        { instrument: 'RELIANCE', ownedQuantity: 50, reservedQuantity: 20 },
      ];
      const openOrders = [
        { side: 'SELL', instrument: 'RELIANCE', remainingQuantity: 15 },
      ];
      const result = verifyPortfolioInvariants({ account, positions, openOrders });
      expect(result.invariantsValid).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('reserved shares (20) does not match open sell orders sum (15)'))).toBe(true);
    });
  });
});
