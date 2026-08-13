import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth';
import { ArtistBioService } from './artist-bio.service';
import { AppError } from '../../shared/lib/errors';

const reviewBioSchema = z.object({
  reviewedContent: z.string().trim().min(1),
});

@Controller('api/v1/ai/artist-bio')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class ArtistBioController {
  constructor(private readonly artistBioService: ArtistBioService) {}

  @Post('concerts/:concertId/upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadPdf(
    @CurrentUser() user: AuthUser,
    @Param('concertId') concertId: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response
  ) {
    if (!file) {
      throw new AppError(400, 'BAD_REQUEST', 'Vui lòng upload file PDF.');
    }

    const result = await this.artistBioService.uploadPdf({
      concertId,
      file,
      createdBy: user.id,
      user,
    });

    return res.status(201).json({ success: true, data: result });
  }

  @Get('concerts/:concertId')
  async getLatestByConcert(
    @CurrentUser() user: AuthUser,
    @Param('concertId') concertId: string,
    @Res() res: Response
  ) {
    const result = await this.artistBioService.getLatestByConcert(concertId, user);
    return res.status(200).json({ success: true, data: result });
  }

  @Patch(':id/review')
  async reviewBio(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response
  ) {
    const dto = reviewBioSchema.parse(body);

    const result = await this.artistBioService.reviewBio({
      artistBioId: id,
      reviewedBio: dto.reviewedContent,
      reviewedBy: user.id,
      user,
    });
    return res.status(200).json({ success: true, data: result });
  }

  @Post(':id/publish')
  async publishBio(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const result = await this.artistBioService.publishBio(id, user);
    return res.status(200).json({ success: true, data: result });
  }
}
