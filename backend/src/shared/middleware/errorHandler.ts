import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${err.stack}`);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    });
  }

  // Fallback for unhandled/internal server errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    },
  });
}
