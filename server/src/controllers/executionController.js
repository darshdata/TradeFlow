import { Execution } from '../models/Execution.js';

export class ExecutionController {
  static async getExecutions(req, res, next) {
    try {
      const userId = req.user.id;
      const { instrument, page = 1, limit = 20 } = req.query;

      const query = {
        $or: [{ buyerId: userId }, { sellerId: userId }],
      };

      if (instrument) {
        query.instrument = instrument.toUpperCase();
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [executions, total] = await Promise.all([
        Execution.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean(),
        Execution.countDocuments(query),
      ]);

      const enriched = executions.map((exec) => {
        const isBuyer = exec.buyerId.toString() === userId.toString();
        return {
          ...exec,
          userSide: isBuyer ? 'BUY' : 'SELL',
        };
      });

      res.status(200).json({
        status: 'success',
        data: {
          executions: enriched,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
