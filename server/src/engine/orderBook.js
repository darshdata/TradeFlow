import { ORDER_SIDES, ORDER_STATUSES } from '../config/constants.js';
import { paiseToRupees } from './financial.js';
import { MatchingEngine } from './matchingEngine.js';
import { logger } from '../utils/logger.js';

export class OrderBookManager {
  constructor() {
    // Map of symbol -> Map of orderId -> Order
    this.books = new Map();
  }

  getSymbolMap(symbol) {
    const sym = symbol.toUpperCase();
    if (!this.books.has(sym)) {
      this.books.set(sym, new Map());
    }
    return this.books.get(sym);
  }

  addOrUpdateOrder(order) {
    if (!order || !order.instrument) return;
    const symbolMap = this.getSymbolMap(order.instrument);
    const orderId = (order._id || order.id).toString();

    // Only keep orders that are active with remaining quantity
    if (
      (order.status === ORDER_STATUSES.OPEN || order.status === ORDER_STATUSES.PARTIALLY_FILLED) &&
      order.remainingQuantity > 0
    ) {
      symbolMap.set(orderId, {
        _id: orderId,
        id: orderId,
        userId: (order.userId?._id || order.userId).toString(),
        instrument: order.instrument.toUpperCase(),
        side: order.side,
        orderType: order.orderType,
        priceInPaise: order.priceInPaise,
        quantity: order.quantity,
        filledQuantity: order.filledQuantity || 0,
        remainingQuantity: order.remainingQuantity,
        status: order.status,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt || order.createdAt),
      });
    } else {
      symbolMap.delete(orderId);
    }
  }

  removeOrder(symbol, orderId) {
    if (!symbol || !orderId) return;
    const symbolMap = this.getSymbolMap(symbol);
    symbolMap.delete(orderId.toString());
  }

  getRestingOrders(symbol) {
    const symbolMap = this.getSymbolMap(symbol);
    return Array.from(symbolMap.values());
  }

  /**
   * Generates Level 2 (L2) aggregated order-book snapshot:
   * Aggregates quantity and order count per price level.
   */
  getL2Snapshot(symbol) {
    const resting = this.getRestingOrders(symbol);
    const bids = resting.filter((o) => o.side === ORDER_SIDES.BUY);
    const asks = resting.filter((o) => o.side === ORDER_SIDES.SELL);

    const aggregateLevels = (orders) => {
      const levelMap = new Map();
      for (const ord of orders) {
        const existing = levelMap.get(ord.priceInPaise) || {
          priceInPaise: ord.priceInPaise,
          rupeePrice: paiseToRupees(ord.priceInPaise),
          totalQuantity: 0,
          orderCount: 0,
        };
        existing.totalQuantity += ord.remainingQuantity;
        existing.orderCount += 1;
        levelMap.set(ord.priceInPaise, existing);
      }
      return Array.from(levelMap.values());
    };

    const aggregatedBids = aggregateLevels(bids).sort((a, b) => b.priceInPaise - a.priceInPaise);
    const aggregatedAsks = aggregateLevels(asks).sort((a, b) => a.priceInPaise - b.priceInPaise);

    const bestBid = aggregatedBids.length > 0 ? aggregatedBids[0] : null;
    const bestAsk = aggregatedAsks.length > 0 ? aggregatedAsks[0] : null;

    let spreadInPaise = null;
    let spreadRupees = null;
    if (bestBid && bestAsk) {
      spreadInPaise = Math.max(0, bestAsk.priceInPaise - bestBid.priceInPaise);
      spreadRupees = paiseToRupees(spreadInPaise);
    }

    return {
      symbol: symbol.toUpperCase(),
      bids: aggregatedBids,
      asks: aggregatedAsks,
      bestBid,
      bestAsk,
      spreadInPaise,
      spreadRupees,
      totalBidQuantity: aggregatedBids.reduce((acc, b) => acc + b.totalQuantity, 0),
      totalAskQuantity: aggregatedAsks.reduce((acc, a) => acc + a.totalQuantity, 0),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Durable recovery: Rebuilds memory books from persisted active orders in MongoDB.
   */
  rebuildFromDatabase(orders = []) {
    this.books.clear();
    let loadedCount = 0;
    for (const order of orders) {
      this.addOrUpdateOrder(order);
      loadedCount++;
    }
    logger.info(`Reconstructed OrderBook in-memory state with ${loadedCount} active orders`);
  }
}

export const orderBookManager = new OrderBookManager();
