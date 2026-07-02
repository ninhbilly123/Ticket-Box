import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';
import { Role } from '../types/auth';

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN_ROLE', 'You do not have permission to access this API.'));
    }

    return next();
  };
}

