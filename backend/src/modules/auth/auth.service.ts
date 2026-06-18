import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { AuthUser, JwtPayload, Role } from '../../shared/types/auth';
import { normalizeRole } from '../rbac/roles';

const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const jwtSecret = process.env.JWT_SECRET || 'ticketbox-dev-access-secret';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  organizationId: string | null;
  status: string;
}

export class AuthService {
  public toPublicUser(user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    role: string;
    organizationId: string | null;
    status: string;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: normalizeRole(user.role),
      organizationId: user.organizationId,
      status: user.status,
    };
  }

  public async register(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new AppError(400, 'AUTH_EMAIL_EXISTS', 'Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: 'AUDIENCE',
        status: 'ACTIVE',
      },
    });

    const tokens = await this.issueTokens(user.id);
    return { user: this.toPublicUser(user), ...tokens };
  }

  public async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.status === 'DISABLED') {
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const tokens = await this.issueTokens(user.id);
    return { user: this.toPublicUser(user), ...tokens };
  }

  public async me(user: AuthUser) {
    const latest = await prisma.user.findUnique({ where: { id: user.id } });
    if (!latest) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    return this.toPublicUser(latest);
  }

  public async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status === 'DISABLED') {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Refresh token is invalid or expired.');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user.id);
    return { user: this.toPublicUser(stored.user), ...tokens };
  }

  public async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { revoked: false };
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt) {
      return { revoked: false };
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }

  private async issueTokens(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      organizationId: user.organizationId,
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresAt };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const authService = new AuthService();
