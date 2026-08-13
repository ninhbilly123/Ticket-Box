import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '../lib/errors';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
    }
    return true;
  }
}
