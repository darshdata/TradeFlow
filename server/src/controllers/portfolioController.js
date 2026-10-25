import { PortfolioService } from '../services/portfolioService.js';

export class PortfolioController {
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
