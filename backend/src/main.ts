import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

const defaultDevOrigins = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

function isPrivateNetworkDevOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const isFrontendPort = url.port === '3001' || url.port === '3002';
    const isHttp = url.protocol === 'http:';
    const isPrivateHost =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
    return isHttp && isFrontendPort && isPrivateHost;
  } catch {
    return false;
  }
}

function getAllowedCorsOrigins() {
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.includes('*') && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN="*" is not allowed in production.');
  }

  return configured.length > 0 ? configured : defaultDevOrigins;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const allowedOrigins = getAllowedCorsOrigins();
  const allowAnyOrigin = allowedOrigins.includes('*');

  app.enableCors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowAnyOrigin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && isPrivateNetworkDevOrigin(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`TicketBox NestJS server running on http://localhost:${port}`);
}

bootstrap();
