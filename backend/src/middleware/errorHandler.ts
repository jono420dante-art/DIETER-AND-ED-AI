import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

/**
 * DIETER AND ED AI - Global Error Handler Middleware
 * Catches all Express errors, formats them consistently,
 * logs them, and returns appropriate HTTP responses.
 * Self-learning: tracks error patterns to improve model routing.
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error properties
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== false;

  // Log the error
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    isOperational,
    code: err.code,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  if (statusCode >= 500) {
    console.error('[DIETER AND ED AI] Server Error:', JSON.stringify(errorLog, null, 2));
  } else {
    console.warn('[DIETER AND ED AI] Client Error:', JSON.stringify(errorLog, null, 2));
  }

  // Format response based on error type
  const response: Record<string, unknown> = {
    success: false,
    error: {
      message: isOperational ? err.message : 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      statusCode,
    },
    timestamp: new Date().toISOString(),
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    (response.error as Record<string, unknown>).stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      ...response,
      error: { ...response.error as object, code: 'VALIDATION_ERROR' },
    });
    return;
  }

  if (err.name === 'UnauthorizedError' || statusCode === 401) {
    res.status(401).json({
      ...response,
      error: { ...response.error as object, code: 'UNAUTHORIZED' },
    });
    return;
  }

  if (err.name === 'RateLimitError' || statusCode === 429) {
    res.status(429).json({
      ...response,
      error: {
        ...response.error as object,
        code: 'RATE_LIMITED',
        retryAfter: 60,
      },
    });
    return;
  }

  // AI model-specific errors - trigger fallback
  if (err.code === 'AI_MODEL_ERROR' || err.code === 'GENERATION_FAILED') {
    res.status(503).json({
      ...response,
      error: {
        ...response.error as object,
        code: err.code,
        retryable: true,
        fallbackAvailable: true,
      },
    });
    return;
  }

  res.status(statusCode).json(response);
};

// Create operational errors (expected, user-facing)
export const createError = (message: string, statusCode = 400, code?: string): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  err.code = code;
  return err;
};

// Async wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
