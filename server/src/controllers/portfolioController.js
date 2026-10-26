import { PortfolioService } from '../services/portfolioService.js';
import { ForbiddenError } from '../utils/errors.js';
import { Account } from '../models/Account.js';

export class PortfolioController {
  static async reconcile(req, res, next) {
    try {
      const requestedUserId = req.query.userId || req.body?.userId;
      const requestedAccountId = req.query.accountId || req.body?.accountId;

      if (requestedUserId && requestedUserId.toString() !== req.user.id.toString()) {
        if (req.user.role !== 'ADMIN') {
          throw new ForbiddenError("You are not authorized to reconcile another user's account");
        }
      }

      if (requestedAccountId) {
        const account = await Account.findById(requestedAccountId).lean();
        if (account && account.userId.toString() !== req.user.id.toString() && req.user.role !== 'ADMIN') {
          throw new ForbiddenError("You are not authorized to reconcile another user's account");
        }
      }

      const targetUserId = (req.user.role === 'ADMIN' && requestedUserId) ? requestedUserId : req.user.id;
      const reconciliation = await PortfolioService.reconcileUserPortfolio(targetUserId);

      res.status(200).json({
        status: 'success',
        data: reconciliation,
      });
    } catch (err) {
      next(err);
    }
  }
  static async getSummary(req, res, next) {
    try {
      const summary = await PortfolioService.getSummary(req.user.id);
      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPositions(req, res, next) {
    try {
      const positions = await PortfolioService.getPositions(req.user.id);
      res.status(200).json({
        status: 'success',
        data: { positions },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAccount(req, res, next) {
    try {
      const summary = await PortfolioService.getSummary(req.user.id);
      res.status(200).json({
        status: 'success',
        data: { account: summary.account },
      });
    } catch (err) {
      next(err);
    }
  }
}
