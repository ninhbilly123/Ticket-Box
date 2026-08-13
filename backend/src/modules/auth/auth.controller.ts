import { Controller, Post, Get, Patch, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth';

const passwordSchema = z.string().min(8);

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
}).refine((data) => data.fullName !== undefined || data.phone !== undefined, {
  message: 'At least one profile field is required.',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  public async register(@Body() body: any) {
    const dto = registerSchema.parse(body);
    const result = await this.authService.register(dto);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(200)
  public async login(@Body() body: any) {
    const dto = loginSchema.parse(body);
    const result = await this.authService.login(dto.email, dto.password);
    return { success: true, data: result };
  }

  @Post('logout')
  @HttpCode(200)
  public async logout(@Body() body: any) {
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
    const result = await this.authService.logout(refreshToken);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(200)
  public async refresh(@Body() body: any) {
    const dto = refreshSchema.parse(body);
    const result = await this.authService.refresh(dto.refreshToken);
    return { success: true, data: result };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  public async me(@CurrentUser() user: AuthUser) {
    const result = await this.authService.me(user);
    return { success: true, data: result };
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  public async updateProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    const dto = updateProfileSchema.parse(body);
    const result = await this.authService.updateProfile(user, dto);
    return { success: true, data: result };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  public async changePassword(@CurrentUser() user: AuthUser, @Body() body: any) {
    const dto = changePasswordSchema.parse(body);
    const result = await this.authService.changePassword(user, dto);
    return { success: true, data: result };
  }
}
