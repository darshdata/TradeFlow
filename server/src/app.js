import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/api.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

export function createApp() {
  const app = express();

  // Explicit CORS configuration supporting local dev and Vercel deployments
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5174', 'http://127.0.0.1:5174', 'https://trade-flow-sigma.vercel.app'];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || /^https:\/\/trade-flow.*\.vercel\.app$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
    })
  );

  // Parsers with reasonable size limits
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  // Root status endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'TradeFlow API Gateway',
      version: '1.0.0',
      status: 'healthy',
      endpoints: {
        health: '/api/health',
        database: '/api/health/database',
        api: '/api/v1',
      },
    });
  });

  // Health check routes
  app.use('/api/health', healthRoutes);

  // API v1 routes
  app.use('/api/v1', apiRoutes);

  // 404 handler for undefined endpoints
  app.use((req, res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
  });

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}
