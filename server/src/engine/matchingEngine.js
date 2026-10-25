import crypto from 'crypto';
import { ORDER_TYPES, ORDER_SIDES, ORDER_STATUSES, STP_POLICY } from '../config/constants.js';
import { calculateNotionalPaise } from './financial.js';
import { OrderExecutionError } from '../utils/errors.js';

/**
 * Pure, deterministic order-matching engine.
 * Price-time priority:
 * - Bids: Highest price first, then earliest created time.
 * - Asks: Lowest price first, then earliest created time.
 * Execution price: Always executes at the resting order's price.
 * Self-trade prevention: Skips crossing orders from the same user to prevent wash trading.
 */
export class MatchingEngine {
  /**
   * Sorts resting buy orders (bids):
   * Price descending (highest first), then createdAt ascending (earliest first).
   */
  static sortBids(bids) {
    return bids.sort((a, b) => {
      if (b.priceInPaise !== a.priceInPaise) {
        return b.priceInPaise - a.priceInPaise;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Sorts resting sell orders (asks):
   * Price ascending (lowest first), then createdAt ascending (earliest first).
   */
  static sortAsks(asks) {
    return asks.sort((a, b) => {
      if (a.priceInPaise !== b.priceInPaise) {
        return a.priceInPaise - b.priceInPaise;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Determines if incoming order crosses with resting order.
   */
  static isCrossing(incoming, resting) {
    if (incoming.orderType === ORDER_TYPES.MARKET) {
      return true;
    }
    if (incoming.side === ORDER_SIDES.BUY) {
      // Incoming BUY crosses resting SELL if buy limit >= resting ask
      return incoming.priceInPaise >= resting.priceInPaise;
    }
    if (incoming.side === ORDER_SIDES.SELL) {
      // Incoming SELL crosses resting BUY if sell limit <= resting bid
      return incoming.priceInPaise <= resting.priceInPaise;
    }
    return false;
  }

  /**
   * Matches an incoming order against the resting order book.
   *
   * @param {Object} incomingOrder - The aggressive incoming order
   * @param {Array<Object>} restingOrders - Copy of current active resting orders for the instrument
   * @returns {Object} result - { executions, updatedRestingOrders, updatedIncomingOrder, remainingRestingOrders }
   */
  static matchOrder(incomingOrder, restingOrders = []) {
    if (!incomingOrder || incomingOrder.remainingQuantity <= 0) {
      throw new OrderExecutionError('Incoming order must have positive remaining quantity');
    }

    const isBuy = incomingOrder.side === ORDER_SIDES.BUY;
    // For incoming BUY, match against resting ASKS (sells).
    // For incoming SELL, match against resting BIDS (buys).
    const opposingOrders = restingOrders.filter(
      (o) => o.side !== incomingOrder.side && o.remainingQuantity > 0 && o.status !== ORDER_STATUSES.FILLED && o.status !== ORDER_STATUSES.CANCELLED
    );

    const sortedOpposing = isBuy
      ? this.sortAsks([...opposingOrders])
      : this.sortBids([...opposingOrders]);

    const executions = [];
    const updatedRestingOrders = [];
    const skippedRestingOrders = [];

    // Clone incoming order state for matching
    const orderState = {
      ...incomingOrder,
      filledQuantity: incomingOrder.filledQuantity || 0,
      remainingQuantity: incomingOrder.remainingQuantity,
      status: incomingOrder.status || ORDER_STATUSES.NEW,
    };

    let totalExecutedValuePaise = 0;

    for (const resting of sortedOpposing) {
      if (orderState.remainingQuantity <= 0) break;

      // Check self-trade prevention (prevent wash trading / trading against own orders)
      const incomingUserId = incomingOrder.userId ? incomingOrder.userId.toString() : null;
      const restingUserId = resting.userId ? resting.userId.toString() : null;
      const incomingOrderId = incomingOrder._id ? incomingOrder._id.toString() : (incomingOrder.id ? incomingOrder.id.toString() : null);
      const restingOrderId = resting._id ? resting._id.toString() : (resting.id ? resting.id.toString() : null);

      if (incomingOrderId === restingOrderId || (incomingUserId && restingUserId && incomingUserId === restingUserId)) {
        // Self-trade detected: skip this resting order and check next
        skippedRestingOrders.push(resting);
        continue;
      }

      // Check crossing condition
      if (!this.isCrossing(incomingOrder, resting)) {
        // Since opposing orders are sorted by best price, if this resting order does not cross,
        // no subsequent resting order will cross either.
        break;
      }

      // Execution occurs at the resting order's price!
      const executionPriceInPaise = resting.priceInPaise;
      const matchQty = Math.min(orderState.remainingQuantity, resting.remainingQuantity);

      if (matchQty <= 0) continue;

      const notionalPaise = calculateNotionalPaise(executionPriceInPaise, matchQty);
      totalExecutedValuePaise += notionalPaise;

      // Update incoming order state
      orderState.filledQuantity += matchQty;
      orderState.remainingQuantity -= matchQty;

      // Update resting order state
      const updatedResting = {
        ...resting,
        filledQuantity: (resting.filledQuantity || 0) + matchQty,
        remainingQuantity: resting.remainingQuantity - matchQty,
        status:
          resting.remainingQuantity - matchQty === 0
            ? ORDER_STATUSES.FILLED
            : ORDER_STATUSES.PARTIALLY_FILLED,
        updatedAt: new Date(),
      };

      // Calculate new weighted average execution price for resting order
      const restingPrevNotional = (resting.averageExecutionPriceInPaise || resting.priceInPaise) * (resting.filledQuantity || 0);
      const restingNewNotional = restingPrevNotional + notionalPaise;
      updatedResting.averageExecutionPriceInPaise = Math.round(restingNewNotional / updatedResting.filledQuantity);

      updatedRestingOrders.push(updatedResting);

      // Create execution record
      const execution = {
        executionId: `EXEC_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        instrument: incomingOrder.instrument,
        buyOrderId: isBuy ? (incomingOrder._id || incomingOrder.id) : (resting._id || resting.id),
        sellOrderId: isBuy ? (resting._id || resting.id) : (incomingOrder._id || incomingOrder.id),
        buyerId: isBuy ? incomingOrder.userId : resting.userId,
        sellerId: isBuy ? resting.userId : incomingOrder.userId,
        priceInPaise: executionPriceInPaise,
        quantity: matchQty,
        notionalPaise,
        takerSide: incomingOrder.side,
        makerOrderId: resting._id || resting.id,
        takerOrderId: incomingOrder._id || incomingOrder.id,
        createdAt: new Date(),
      };

      executions.push(execution);
    }

    // Determine final status of incoming order
    if (orderState.remainingQuantity === 0) {
      orderState.status = ORDER_STATUSES.FILLED;
    } else if (orderState.filledQuantity > 0) {
      if (incomingOrder.orderType === ORDER_TYPES.MARKET) {
        // Market order remainder policy (IOC): cancel unfilled portion
        orderState.status = ORDER_STATUSES.CANCELLED;
      } else {
        orderState.status = ORDER_STATUSES.PARTIALLY_FILLED;
      }
    } else {
      if (incomingOrder.orderType === ORDER_TYPES.MARKET) {
        // Market order with no liquidity: cancel/reject
        orderState.status = ORDER_STATUSES.CANCELLED;
      } else {
        orderState.status = ORDER_STATUSES.OPEN;
      }
    }

    // Calculate weighted average execution price for incoming order
    if (orderState.filledQuantity > 0) {
      orderState.averageExecutionPriceInPaise = Math.round(totalExecutedValuePaise / orderState.filledQuantity);
    } else {
      orderState.averageExecutionPriceInPaise = 0;
    }
    orderState.updatedAt = new Date();

    return {
      executions,
      updatedRestingOrders,
      updatedIncomingOrder: orderState,
    };
  }
}
