import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // Check if error is custom AppError
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected server error occurred';
  let details = err.details || null;

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyPattern || {})[0] || 'resource';
    message = `A record with this ${field} already exists.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value for ${err.path}`;
  }

  // Log error with context
  if (statusCode >= 500) {
    logger.error(`[500 Internal Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
      stack: err.stack,
      body: req.body,
    });
  } else {
    logger.warn(`[${statusCode} Client Error] ${req.method} ${req.originalUrl}: ${message}`, {
      code,
      details,
    });
  }

  // Response payload (never expose stack trace in production)
  const responsePayload = {
    status: 'error',
    code,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
  };

  res.status(statusCode).json(responsePayload);
}
