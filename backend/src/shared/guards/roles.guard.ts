import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../lib/errors';
import { Role } from '../types/auth';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
    }
    if (!requiredRoles.includes(request.user.role)) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'You do not have permission to access this API.');
    }
    return true;
  }
}
