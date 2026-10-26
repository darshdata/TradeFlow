import { Account } from '../models/Account.js';
import { Position } from '../models/Position.js';
import { Order } from '../models/Order.js';
import { Instrument } from '../models/Instrument.js';
import { Execution } from '../models/Execution.js';
import { ORDER_STATUSES } from '../config/constants.js';
import { verifyPortfolioInvariants } from '../engine/financial.js';
import { withTransaction } from '../config/database.js';

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

    // Authoritative ledger invariant reconciliation
    const auditResult = verifyPortfolioInvariants({
      account: account.toObject ? account.toObject() : account,
      positions,
      openOrders,
    });

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
        isReconciled: auditResult.invariantsValid,
        discrepancies: auditResult.discrepancies,
        sumActiveBuyReservations: auditResult.details.expectedReservedCashPaise,
        recordedReservedCashPaise: account.reservedCashPaise,
      },
    };
  }

  /**
   * Authoritative portfolio invariant reconciliation endpoint service.
   * Employs multi-document transaction snapshot isolation when a replica set is active,
   * guaranteeing that account cash, positions, and active orders are evaluated against
   * the exact same point-in-time database snapshot.
   */
  static async reconcileUserPortfolio(userId) {
    return await withTransaction(async (session) => {
      let accountQuery = Account.findOne({ userId });
      let positionsQuery = Position.find({ userId });
      let ordersQuery = Order.find({
        userId,
        status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
      });

      if (session) {
        accountQuery = accountQuery.session(session);
        positionsQuery = positionsQuery.session(session);
        ordersQuery = ordersQuery.session(session);
      } else {
        accountQuery = accountQuery.readConcern('majority');
        positionsQuery = positionsQuery.readConcern('majority');
        ordersQuery = ordersQuery.readConcern('majority');
      }

      let account = await accountQuery;
      if (!account) {
        if (session) {
          const created = await Account.create([{ userId }], { session });
          account = created[0];
        } else {
          account = await Account.create({ userId });
        }
      }

      const [positions, openOrders] = await Promise.all([
        positionsQuery.lean(),
        ordersQuery.lean(),
      ]);

      const result = verifyPortfolioInvariants({
        account: account.toObject ? account.toObject() : account,
        positions,
        openOrders,
      });

      return {
        userId,
        invariantsValid: result.invariantsValid,
        discrepancies: result.discrepancies,
        details: result.details,
        readIsolation: session ? 'TRANSACTIONAL_SNAPSHOT' : 'MAJORITY_READ_CONCERN',
        reconciledAt: new Date().toISOString(),
      };
    });
  }

  static async getPositions(userId) {
    const summary = await this.getSummary(userId);
    return summary.positions;
  }
}
