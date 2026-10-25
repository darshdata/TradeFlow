// Domain and HTTP Error classes for TradeFlow

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT_ERROR') {
    super(message, 409, code);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient available funds for order reservation') {
    super(message, 400, 'INSUFFICIENT_FUNDS');
  }
}

export class InsufficientSharesError extends AppError {
  constructor(message = 'Insufficient available shares for sell reservation') {
    super(message, 400, 'INSUFFICIENT_SHARES');
  }
}

export class OrderExecutionError extends AppError {
  constructor(message, code = 'ORDER_EXECUTION_ERROR') {
    super(message, 422, code);
  }
}
