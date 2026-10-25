import { z } from 'zod';
import { ORDER_TYPES, ORDER_SIDES } from '../config/constants.js';

export const createOrderSchema = z
  .object({
    instrument: z
      .string({ required_error: 'Instrument is required' })
      .trim()
      .min(1)
      .toUpperCase(),
    side: z.enum([ORDER_SIDES.BUY, ORDER_SIDES.SELL], {
      required_error: 'Side must be BUY or SELL',
    }),
    orderType: z.enum([ORDER_TYPES.MARKET, ORDER_TYPES.LIMIT], {
      required_error: 'Order type must be MARKET or LIMIT',
    }),
    priceInPaise: z.coerce.number().int().nonnegative().optional().default(0),
    quantity: z.coerce
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .positive('Quantity must be greater than 0'),
    idempotencyKey: z.string().trim().min(8).max(128).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.orderType === ORDER_TYPES.LIMIT) {
        return data.priceInPaise > 0;
      }
      return true;
    },
    {
      message: 'Limit orders require a positive price in paise',
      path: ['priceInPaise'],
    }
  );

export const queryOrdersSchema = z.object({
  status: z.string().optional(),
  instrument: z.string().optional(),
  side: z.enum(['BUY', 'SELL']).optional(),
  orderType: z.enum(['MARKET', 'LIMIT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
