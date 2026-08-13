import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();

    console.error(`[Error]`, exception instanceof Error ? exception.stack : exception);

    if (exception instanceof ZodError) {
      return response.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: exception.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
          timestamp,
          path: request.originalUrl,
        },
      });
    }

    if (exception instanceof SyntaxError && 'body' in exception) {
      return response.status(400).json({
        success: false,
        errorCode: 'BAD_REQUEST',
        message: 'Request JSON không hợp lệ.',
        timestamp,
        error: {
          code: 'BAD_REQUEST',
          message: 'Request JSON không hợp lệ.',
          timestamp,
          path: request.originalUrl,
        },
      });
    }

    if (exception instanceof Error && exception.name === 'MulterError') {
      return response.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_INVALID',
          message: 'File upload không hợp lệ hoặc vượt quá giới hạn kích thước.',
          timestamp,
          path: request.originalUrl,
        },
      });
    }

    if (exception instanceof AppError) {
      return response.status(exception.statusCode).json({
        success: false,
        errorCode: exception.errorCode,
        message: exception.message,
        timestamp,
        error: {
          code: exception.errorCode,
          message: exception.message,
          timestamp,
          path: request.originalUrl,
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      return response.status(status).json({
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || 'HTTP Error',
          timestamp,
          path: request.originalUrl,
        },
      });
    }

    return response.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',
        timestamp,
        path: request.originalUrl,
      },
    });
  }
}
