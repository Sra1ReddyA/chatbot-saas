import type { Response } from 'express';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class PlanLimitError extends AppError {
  constructor(resource: string) {
    super(`Plan limit reached for ${resource}. Please upgrade your plan.`, 402, 'PLAN_LIMIT_EXCEEDED', { resource });
  }
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(process.env.NODE_ENV !== 'production' && error.details
        ? { details: error.details }
        : {}),
    });
    return;
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', { message: error.message, stack: error.stack });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): void {
  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
}

export function asyncHandler<T extends (...args: unknown[]) => Promise<void>>(fn: T): T {
  return ((...args: unknown[]) => {
    const result = fn(...args);
    const next = args[2] as (err?: unknown) => void;
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
    return result;
  }) as T;
}
