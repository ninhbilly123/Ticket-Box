import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { JwtPayload } from '../types/auth';
import { normalizeRole } from '../../modules/rbac/roles';

const jwtSecret = process.env.JWT_SECRET || 'ticketbox-dev-access-secret';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Missing or invalid bearer token.');
    }

    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'DISABLED') {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'User is no longer active.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: normalizeRole(user.role),
      organizationId: user.organizationId,
      status: user.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Invalid or expired access token.'));
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return next();
  }
  return authenticate(req, res, next);
}

