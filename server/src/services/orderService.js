import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Account } from '../models/Account.js';
import { Position } from '../models/Position.js';
import { Execution } from '../models/Execution.js';
import { OrderEvent } from '../models/OrderEvent.js';
import { Instrument } from '../models/Instrument.js';
import { IdempotencyRecord } from '../models/IdempotencyRecord.js';
import {
  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUSES,
  ORDER_EVENTS,
  CANCELLABLE_ORDER_STATUSES,
  MARKET_BUY_BUFFER_PERCENT,
} from '../config/constants.js';
import { MatchingEngine } from '../engine/matchingEngine.js';
import { orderBookManager } from '../engine/orderBook.js';
import {
  calculateNotionalPaise,
  validateTickSize,
  calculatePriceImprovementRefund,
} from '../engine/financial.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InsufficientFundsError,
  InsufficientSharesError,
  OrderExecutionError,
} from '../utils/errors.js';
import { withTransaction } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { getMarketHoursStatus } from '../utils/marketHours.js';

export class OrderService {
  /**
   * Submits and matches an order atomically with reservation accounting,
   * idempotency protection, and append-only audit trail.
   */
  static async submitOrder({
    userId,
    instrument: symbolInput,
    side,
    orderType,
    priceInPaise = 0,
    quantity,
    idempotencyKey = null,
    enforceExchangeHours = false,
  }) {
    const symbol = symbolInput.toUpperCase();

    // 0. Market Hours Validation (when enforceExchangeHours is explicitly requested)
    if (enforceExchangeHours) {
      const { isRegularOpen, regularHours } = getMarketHoursStatus();
      if (!isRegularOpen) {
        throw new ValidationError(
          `Order rejected: Regular equity exchange is closed (${regularHours}). Enable Extended Simulation Mode to place and match orders outside regular hours.`
        );
      }
    }

    // 1. Idempotency Check
    let fingerprint = null;
    if (idempotencyKey) {
      fingerprint = crypto
        .createHash('sha256')
        .update(JSON.stringify({ symbol, side, orderType, priceInPaise, quantity }))
        .digest('hex');

      const existingRecord = await IdempotencyRecord.findOne({
        key: idempotencyKey,
        userId,
      });

      if (existingRecord) {
        if (existingRecord.requestFingerprint === fingerprint) {
          logger.info(`Idempotent request replay detected for key: ${idempotencyKey}`);
          return existingRecord.responseBody;
        } else {
          throw new ConflictError(
            'Idempotency key has already been used with a different request payload',
            'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
          );
        }
      }
    }

    // 2. Instrument & Tick Validation
    const instrument = await Instrument.findOne({ symbol });
    if (!instrument || !instrument.tradable) {
      throw new ValidationError(`Instrument ${symbol} is not available or tradable`);
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError(`Quantity must be a positive integer, received: ${quantity}`);
    }

    if (orderType === ORDER_TYPES.LIMIT) {
      if (!Number.isSafeInteger(priceInPaise) || priceInPaise <= 0) {
        throw new ValidationError(`Limit price must be a positive integer in paise, received: ${priceInPaise}`);
      }
      if (!validateTickSize(priceInPaise, instrument.tickSizePaise)) {
        throw new ValidationError(
          `Price ${priceInPaise} paise violates tick size rule (${instrument.tickSizePaise} paise)`
        );
      }
    }

    // 3. Determine reservation requirements
    let reservedPrice = priceInPaise;
    let requiredCashReservation = 0;
    let requiredShareReservation = 0;

    if (side === ORDER_SIDES.BUY) {
      if (orderType === ORDER_TYPES.LIMIT) {
        requiredCashReservation = calculateNotionalPaise(priceInPaise, quantity);
      } else {
        // Market BUY: reserve using worst-case price collar
        const l2 = orderBookManager.getL2Snapshot(symbol);
        const refPrice = l2.bestAsk ? l2.bestAsk.priceInPaise : instrument.simulatedReferencePricePaise;
        reservedPrice = Math.round(refPrice * (1 + MARKET_BUY_BUFFER_PERCENT / 100));
        requiredCashReservation = calculateNotionalPaise(reservedPrice, quantity);
      }
    } else {
      // SELL order: reserve quantity of shares
      requiredShareReservation = quantity;
    }

    // Generate human-readable order reference ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `ORD-${dateStr}-${randSuffix}`;

    // 4. Atomic Execution inside Transaction
    const result = await withTransaction(async (session) => {
      // 4a. Reserve cash or shares with strict atomic condition
      if (side === ORDER_SIDES.BUY) {
        const updatedAccount = await Account.findOneAndUpdate(
          {
            userId,
            $expr: {
              $gte: [{ $subtract: ['$totalCashPaise', '$reservedCashPaise'] }, requiredCashReservation],
            },
          },
          {
            $inc: { reservedCashPaise: requiredCashReservation },
          },
          { new: true, session }
        );

        if (!updatedAccount) {
          throw new InsufficientFundsError(
            `Insufficient available cash to reserve ${requiredCashReservation} paise`
          );
        }
      } else {
        // SELL side: ensure position exists and has sufficient available shares
        const updatedPosition = await Position.findOneAndUpdate(
          {
            userId,
            instrument: symbol,
            $expr: {
              $gte: [{ $subtract: ['$ownedQuantity', '$reservedQuantity'] }, requiredShareReservation],
            },
          },
          {
            $inc: { reservedQuantity: requiredShareReservation },
          },
          { new: true, session }
        );

        if (!updatedPosition) {
          throw new InsufficientSharesError(
            `Insufficient available shares to reserve ${requiredShareReservation} shares in ${symbol}`
          );
        }
      }

      // 4b. Create initial order document
      const order = new Order({
        orderId,
        userId,
        instrument: symbol,
        side,
        orderType,
        priceInPaise: orderType === ORDER_TYPES.LIMIT ? priceInPaise : 0,
        quantity,
        filledQuantity: 0,
        remainingQuantity: quantity,
        reservedCashPaise: requiredCashReservation,
        reservedQuantity: requiredShareReservation,
        averageExecutionPriceInPaise: 0,
        status: ORDER_STATUSES.NEW,
        idempotencyKey,
      });

      await order.save({ session });

      // Append ORDER_ACCEPTED & RESERVATION_CREATED events
      await OrderEvent.insertMany(
        [
          {
            orderId: order._id,
            userId,
            eventType: ORDER_EVENTS.ORDER_ACCEPTED,
            metadata: {
              symbol,
              side,
              orderType,
              priceInPaise,
              quantity,
            },
          },
          {
            orderId: order._id,
            userId,
            eventType: ORDER_EVENTS.RESERVATION_CREATED,
            metadata: {
              reservedCashPaise: requiredCashReservation,
              reservedQuantity: requiredShareReservation,
            },
          },
        ],
        { session }
      );

      // 4c. Run Pure Matching Engine
      const restingOrders = orderBookManager.getRestingOrders(symbol);
      const matchResult = MatchingEngine.matchOrder(order.toObject(), restingOrders);
      const { executions, updatedRestingOrders, updatedIncomingOrder } = matchResult;

      // 4d. Persist Executions & Update Counterparties
      for (const execData of executions) {
        // Save immutable execution record
        const executionDoc = new Execution({
          executionId: execData.executionId,
          instrument: symbol,
          buyOrderId: execData.buyOrderId,
          sellOrderId: execData.sellOrderId,
          buyerId: execData.buyerId,
          sellerId: execData.sellerId,
          priceInPaise: execData.priceInPaise,
          quantity: execData.quantity,
          notionalPaise: execData.notionalPaise,
          takerSide: execData.takerSide,
          timestamp: execData.createdAt,
        });
        await executionDoc.save({ session });

        // Update Buyer account and position
        const isBuyerTaker = side === ORDER_SIDES.BUY;
        const restingMakerOrder = updatedRestingOrders.find(
          (r) => (r._id || r.id).toString() === execData.buyOrderId.toString()
        );
        const buyerReservedUnitPrice = isBuyerTaker
          ? reservedPrice
          : (restingMakerOrder ? restingMakerOrder.priceInPaise : execData.priceInPaise);

        const buyerReservedReleased = buyerReservedUnitPrice * execData.quantity;

        // Deduct actual executed notional from cash, reduce reserved cash
        await Account.findOneAndUpdate(
          { userId: execData.buyerId },
          {
            $inc: {
              totalCashPaise: -execData.notionalPaise,
              reservedCashPaise: -buyerReservedReleased,
            },
          },
          { session }
        );

        // Credit shares to buyer position & calculate cost basis
        const buyerPosition = await Position.findOne({
          userId: execData.buyerId,
          instrument: symbol,
        }).session(session);

        if (buyerPosition) {
          const newOwnedQty = buyerPosition.ownedQuantity + execData.quantity;
          const newTotalCost = buyerPosition.totalCostBasisPaise + execData.notionalPaise;
          const newAvgCost = Math.round(newTotalCost / newOwnedQty);

          buyerPosition.ownedQuantity = newOwnedQty;
          buyerPosition.totalCostBasisPaise = newTotalCost;
          buyerPosition.averageCostPricePaise = newAvgCost;
          await buyerPosition.save({ session });
        } else {
          const newPos = new Position({
            userId: execData.buyerId,
            instrument: symbol,
            ownedQuantity: execData.quantity,
            reservedQuantity: 0,
            averageCostPricePaise: execData.priceInPaise,
            totalCostBasisPaise: execData.notionalPaise,
            realizedPnlPaise: 0,
          });
          await newPos.save({ session });
        }

        // Update Seller account and position
        await Account.findOneAndUpdate(
          { userId: execData.sellerId },
          {
            $inc: {
              totalCashPaise: execData.notionalPaise,
            },
          },
          { session }
        );

        // Deduct shares from seller position & compute realized P&L
        const sellerPosition = await Position.findOne({
          userId: execData.sellerId,
          instrument: symbol,
        }).session(session);

        if (sellerPosition) {
          const costOfSharesSold = sellerPosition.averageCostPricePaise * execData.quantity;
          const realizedPnl = execData.notionalPaise - costOfSharesSold;

          sellerPosition.ownedQuantity -= execData.quantity;
          sellerPosition.reservedQuantity -= execData.quantity;
          sellerPosition.totalCostBasisPaise = Math.max(0, sellerPosition.totalCostBasisPaise - costOfSharesSold);
          sellerPosition.realizedPnlPaise += realizedPnl;
          if (sellerPosition.ownedQuantity === 0) {
            sellerPosition.averageCostPricePaise = 0;
            sellerPosition.totalCostBasisPaise = 0;
          }
          await sellerPosition.save({ session });
        }
      }

      // 4e. Persist Updated Resting Orders
      for (const updatedResting of updatedRestingOrders) {
        const remainingReservedCash = updatedResting.side === ORDER_SIDES.BUY
          ? updatedResting.priceInPaise * updatedResting.remainingQuantity
          : 0;
        const remainingReservedShares = updatedResting.side === ORDER_SIDES.SELL
          ? updatedResting.remainingQuantity
          : 0;

        await Order.findByIdAndUpdate(
          updatedResting._id || updatedResting.id,
          {
            filledQuantity: updatedResting.filledQuantity,
            remainingQuantity: updatedResting.remainingQuantity,
            reservedCashPaise: remainingReservedCash,
            reservedQuantity: remainingReservedShares,
            status: updatedResting.status,
            averageExecutionPriceInPaise: updatedResting.averageExecutionPriceInPaise,
            updatedAt: new Date(),
          },
          { session }
        );

        // Append resting order fill event
        const restingEvent = new OrderEvent({
          orderId: updatedResting._id || updatedResting.id,
          userId: updatedResting.userId,
          eventType:
            updatedResting.status === ORDER_STATUSES.FILLED
              ? ORDER_EVENTS.ORDER_FILLED
              : ORDER_EVENTS.ORDER_PARTIALLY_FILLED,
          metadata: {
            filledQuantity: updatedResting.filledQuantity,
            remainingQuantity: updatedResting.remainingQuantity,
            averagePrice: updatedResting.averageExecutionPriceInPaise,
          },
        });
        await restingEvent.save({ session });
      }

      // 4f. Finalize Incoming Order State
      order.filledQuantity = updatedIncomingOrder.filledQuantity;
      order.remainingQuantity = updatedIncomingOrder.remainingQuantity;
      order.status = updatedIncomingOrder.status;
      order.averageExecutionPriceInPaise = updatedIncomingOrder.averageExecutionPriceInPaise;

      // Handle Market Order remainder (IOC) or Limit Order remainder refunds
      if (orderType === ORDER_TYPES.MARKET) {
        if (order.remainingQuantity > 0) {
          // Unfilled market order remainder is cancelled; release reservation
          if (side === ORDER_SIDES.BUY) {
            const remainderCash = reservedPrice * order.remainingQuantity;
            await Account.findOneAndUpdate(
              { userId },
              { $inc: { reservedCashPaise: -remainderCash } },
              { session }
            );
            order.reservedCashPaise -= remainderCash;
          } else {
            await Position.findOneAndUpdate(
              { userId, instrument: symbol },
              { $inc: { reservedQuantity: -order.remainingQuantity } },
              { session }
            );
            order.reservedQuantity -= order.remainingQuantity;
          }

          await OrderEvent.insertMany(
            [
              {
                orderId: order._id,
                userId,
                eventType: ORDER_EVENTS.RESERVATION_RELEASED,
                metadata: {
                  reason: 'MARKET_ORDER_IOC_REMAINDER_RELEASE',
                  unfilledQuantity: order.remainingQuantity,
                },
              },
              {
                orderId: order._id,
                userId,
                eventType: ORDER_EVENTS.ORDER_CANCELLED,
                metadata: {
                  reason: 'Immediate-Or-Cancel market order remainder',
                },
              },
            ],
            { session }
          );
        }
      } else {
        // Limit order
        if (order.remainingQuantity > 0) {
          const openEvent = new OrderEvent({
            orderId: order._id,
            userId,
            eventType:
              order.filledQuantity > 0
                ? ORDER_EVENTS.ORDER_PARTIALLY_FILLED
                : ORDER_EVENTS.ORDER_OPENED,
            metadata: {
              remainingQuantity: order.remainingQuantity,
            },
          });
          await openEvent.save({ session });
        } else {
          // Fully filled limit order
          const filledEvent = new OrderEvent({
            orderId: order._id,
            userId,
            eventType: ORDER_EVENTS.ORDER_FILLED,
            metadata: {
              averagePrice: order.averageExecutionPriceInPaise,
            },
          });
          await filledEvent.save({ session });
        }
      }

      // Sync reservation balances on the order document
      order.reservedCashPaise = order.side === ORDER_SIDES.BUY
        ? (order.status === ORDER_STATUSES.FILLED || order.status === ORDER_STATUSES.CANCELLED ? 0 : order.priceInPaise * order.remainingQuantity)
        : 0;
      order.reservedQuantity = order.side === ORDER_SIDES.SELL
        ? (order.status === ORDER_STATUSES.FILLED || order.status === ORDER_STATUSES.CANCELLED ? 0 : order.remainingQuantity)
        : 0;

      await order.save({ session });

      // Update Instrument last price if trades occurred
      if (executions.length > 0) {
        const lastExec = executions[executions.length - 1];
        await Instrument.findOneAndUpdate(
          { symbol },
          {
            lastPricePaise: lastExec.priceInPaise,
            $max: { dayHighPaise: lastExec.priceInPaise },
            $min: { dayLowPaise: lastExec.priceInPaise },
            priceUpdatedAt: new Date(),
          },
          { session }
        );
      }

      return {
        order,
        executions,
        updatedRestingOrders,
      };
    });

    // Update in-memory order book ONLY after MongoDB transaction commits successfully
    for (const updatedResting of result.updatedRestingOrders) {
      orderBookManager.addOrUpdateOrder(updatedResting);
    }
    if (result.order.status === ORDER_STATUSES.OPEN || result.order.status === ORDER_STATUSES.PARTIALLY_FILLED) {
      orderBookManager.addOrUpdateOrder(result.order.toObject());
    }

    const responseData = {
      order: result.order,
      executions: result.executions,
    };

    // 5. Store Idempotency Record if key was provided
    if (idempotencyKey && fingerprint) {
      try {
        await IdempotencyRecord.create({
          key: idempotencyKey,
          userId,
          operation: 'SUBMIT_ORDER',
          requestFingerprint: fingerprint,
          responseBody: responseData,
          statusCode: 201,
        });
      } catch (err) {
        logger.warn('Failed to store idempotency record', { error: err.message });
      }
    }

    return responseData;
  }

  /**
   * Safely cancels an eligible order, protecting against race conditions
   * and releasing remaining cash or share reservations.
   */
  static async cancelOrder(orderId, userId) {
    const order = await Order.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderId }],
    });

    if (!order) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to cancel this order');
    }

    if (!CANCELLABLE_ORDER_STATUSES.has(order.status)) {
      throw new ConflictError(
        `Order cannot be cancelled in status: ${order.status}`,
        'ORDER_NOT_CANCELLABLE'
      );
    }

    const cancelledOrder = await withTransaction(async (session) => {
      // Atomic conditional update to handle races where order filled concurrently
      const updated = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: { $in: Array.from(CANCELLABLE_ORDER_STATUSES) },
        },
        {
          status: ORDER_STATUSES.CANCELLED,
          reservedCashPaise: 0,
          reservedQuantity: 0,
          updatedAt: new Date(),
        },
        { new: true, session }
      );

      if (!updated) {
        const current = await Order.findById(order._id).session(session);
        throw new ConflictError(
          `Order could not be cancelled because its status changed to ${current?.status}`,
          'ORDER_STATUS_CHANGED'
        );
      }

      // Release reservations for remaining quantity
      if (updated.side === ORDER_SIDES.BUY) {
        const cashToRelease = updated.priceInPaise * updated.remainingQuantity;
        if (cashToRelease > 0) {
          await Account.findOneAndUpdate(
            { userId },
            { $inc: { reservedCashPaise: -cashToRelease } },
            { session }
          );
        }
      } else {
        const sharesToRelease = updated.remainingQuantity;
        if (sharesToRelease > 0) {
          await Position.findOneAndUpdate(
            { userId, instrument: updated.instrument },
            { $inc: { reservedQuantity: -sharesToRelease } },
            { session }
          );
        }
      }

      // Record cancellation audit events
      await OrderEvent.insertMany(
        [
          {
            orderId: updated._id,
            userId,
            eventType: ORDER_EVENTS.ORDER_CANCELLED,
            metadata: {
              remainingQuantity: updated.remainingQuantity,
              reason: 'USER_REQUESTED_CANCELLATION',
            },
          },
          {
            orderId: updated._id,
            userId,
            eventType: ORDER_EVENTS.RESERVATION_RELEASED,
            metadata: {
              remainingQuantity: updated.remainingQuantity,
            },
          },
        ],
        { session }
      );

      return updated;
    });

    // Remove from in-memory book after successful transaction commit
    orderBookManager.removeOrder(cancelledOrder.instrument, cancelledOrder._id);

    return cancelledOrder;
  }

  /**
   * Retrieves orders with pagination and filters.
   */
  static async getOrders(userId, { status, instrument, side, orderType, page = 1, limit = 20 }) {
    const query = { userId };
    if (status && status !== 'ALL') query.status = status;
    if (instrument) query.instrument = instrument.toUpperCase();
    if (side) query.side = side;
    if (orderType) query.orderType = orderType;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieves single order by ID with ownership verification and audit trail events.
   */
  static async getOrderDetails(orderId, userId) {
    const order = await Order.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderId }],
    }).lean();

    if (!order) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to view this order');
    }

    const [events, executions] = await Promise.all([
      OrderEvent.find({ orderId: order._id }).sort({ timestamp: 1 }).lean(),
      Execution.find({
        $or: [{ buyOrderId: order._id }, { sellOrderId: order._id }],
      })
        .sort({ timestamp: -1 })
        .lean(),
    ]);

    return {
      order,
      events,
      executions,
    };
  }
}
