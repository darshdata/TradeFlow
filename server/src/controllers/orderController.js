import { OrderService } from '../services/orderService.js';

export class OrderController {
  static async createOrder(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey || null;
      const enforceExchangeHours =
        req.headers['x-enforce-exchange-hours'] === 'true' || req.body.enforceExchangeHours === true;

      const result = await OrderService.submitOrder({
        userId: req.user.id,
        instrument: req.body.instrument,
        side: req.body.side,
        orderType: req.body.orderType,
        priceInPaise: req.body.priceInPaise,
        quantity: req.body.quantity,
        idempotencyKey,
        enforceExchangeHours,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrders(req, res, next) {
    try {
      const result = await OrderService.getOrders(req.user.id, req.query);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderById(req, res, next) {
    try {
      const result = await OrderService.getOrderDetails(req.params.id, req.user.id);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const result = await OrderService.cancelOrder(req.params.id, req.user.id);
      res.status(200).json({
        status: 'success',
        message: 'Order cancelled successfully',
        data: { order: result },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderEvents(req, res, next) {
    try {
      const result = await OrderService.getOrderDetails(req.params.id, req.user.id);
      res.status(200).json({
        status: 'success',
        data: {
          events: result.events,
          executions: result.executions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
