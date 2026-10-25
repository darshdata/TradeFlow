import { getMarketHoursStatus } from '../utils/marketHours.js';

export class MarketController {
  static getStatus(req, res) {
    const status = getMarketHoursStatus();
    return res.json({
      success: true,
      data: status,
    });
  }
}
