import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5002),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5174'),
  MONGODB_URI: z.string().optional().default(''),
  JWT_SECRET: z.string().min(16).default('tradeflow_jwt_secret_dev_key_must_be_long_and_safe_min_32_chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  SIMULATED_MARKET_ENABLED: z.coerce.boolean().default(true),
  DEMO_LIQUIDITY_INTERVAL_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment configuration', { errors: parsed.error.format() });
  throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.format())}`);
}

export const env = parsed.data;
