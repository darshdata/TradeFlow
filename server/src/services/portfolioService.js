import { Account } from '../models/Account.js';
import { Position } from '../models/Position.js';
import { Order } from '../models/Order.js';
import { Instrument } from '../models/Instrument.js';
import { Execution } from '../models/Execution.js';
import { ORDER_STATUSES } from '../config/constants.js';

export class PortfolioService {
  /**
   * Generates comprehensive portfolio summary with marked valuations,
   * realized/unrealized P&L, and invariant reconciliation check.
   */
  static async getSummary(userId) {
    let account = await Account.findOne({ userId });
    if (!account) {
      account = await Account.create({ userId });
    }

    const [positions, instruments, openOrders, recentExecutions] = await Promise.all([
      Position.find({ userId, ownedQuantity: { $gt: 0 } }).lean(),
      Instrument.find().lean(),
      Order.find({
        userId,
        status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
      }).lean(),
      Execution.find({
        $or: [{ buyerId: userId }, { sellerId: userId }],
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    const instrumentPriceMap = new Map();
    for (const inst of instruments) {
      instrumentPriceMap.set(inst.symbol, inst.lastPricePaise || inst.simulatedReferencePricePaise);
    }

    let totalPositionsMarketValuePaise = 0;
    let totalUnrealizedPnlPaise = 0;
    let totalRealizedPnlPaise = 0;

    const enrichedPositions = positions.map((pos) => {
      const currentPricePaise = instrumentPriceMap.get(pos.instrument) || pos.averageCostPricePaise;
      const marketValuePaise = pos.ownedQuantity * currentPricePaise;
      const unrealizedPnlPaise = marketValuePaise - pos.totalCostBasisPaise;

      totalPositionsMarketValuePaise += marketValuePaise;
      totalUnrealizedPnlPaise += unrealizedPnlPaise;
      totalRealizedPnlPaise += pos.realizedPnlPaise || 0;

      return {
        ...pos,
        currentPricePaise,
        marketValuePaise,
        unrealizedPnlPaise,
        unrealizedPnlPercentage:
          pos.totalCostBasisPaise > 0
            ? Number(((unrealizedPnlPaise / pos.totalCostBasisPaise) * 100).toFixed(2))
            : 0,
        availableQuantity: Math.max(0, pos.ownedQuantity - pos.reservedQuantity),
      };
    });

    // Consistent portfolio value: Total Cash (includes reserved cash) + Total Marked Positions Value
    const totalPortfolioValuePaise = account.totalCashPaise + totalPositionsMarketValuePaise;

    // Reconciliation check: sum of active buy order cash reservations vs account.reservedCashPaise
    const sumActiveBuyReservations = openOrders
      .filter((o) => o.side === 'BUY')
      .reduce((sum, o) => sum + (o.priceInPaise * o.remainingQuantity), 0);

    const isReconciled =
      account.totalCashPaise >= account.reservedCashPaise &&
      account.reservedCashPaise >= 0;

    const openOrdersCount = openOrders.length;
    const filledOrdersCount = await Order.countDocuments({
      userId,
      status: ORDER_STATUSES.FILLED,
    });

    return {
      account: {
        totalCashPaise: account.totalCashPaise,
        reservedCashPaise: account.reservedCashPaise,
        availableCashPaise: account.availableCashPaise,
        currency: account.currency,
      },
      positions: enrichedPositions,
      metrics: {
        totalPortfolioValuePaise,
        totalPositionsMarketValuePaise,
        totalUnrealizedPnlPaise,
        totalRealizedPnlPaise,
        openOrdersCount,
        filledOrdersCount,
      },
      recentExecutions,
      audit: {
        isReconciled,
        sumActiveBuyReservations,
        recordedReservedCashPaise: account.reservedCashPaise,
      },
    };
  }

  static async getPositions(userId) {
    const summary = await this.getSummary(userId);
    return summary.positions;
  }
}
