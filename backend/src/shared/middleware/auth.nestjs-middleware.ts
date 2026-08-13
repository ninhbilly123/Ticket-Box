import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../modules/prisma.service';
import { normalizeRole } from '../../modules/rbac/roles';
import { JwtPayload } from '../types/auth';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next();
      }

      const token = header.slice('Bearer '.length);
      const payload = jwt.verify(token, secret) as JwtPayload;

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'DISABLED') {
        return next();
      }

      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: normalizeRole(user.role),
        organizationId: user.organizationId,
        status: 'ACTIVE',
      };
    } catch {
      // Invalid token - continue without user
    }

    return next();
  }
}
