import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';

import { AuthorizationService } from '../rbac/authorization.service';
import { AppError } from '../../shared/lib/errors';
import { ARTIST_BIO_BUCKET, safeObjectName, uploadObject } from '../../shared/lib/storage';
import { getAiBioQueue } from '../../shared/lib/job-queues';
import { invalidateConcertDetailCache } from '../concert/concert-detail-cache';
import { AuthUser } from '../../shared/types/auth';


function hasReplacementCharacter(value: string) {
  return value.includes('\uFFFD');
}

function assertReadableVietnameseBio(value: string) {
  if (hasReplacementCharacter(value)) {
    throw new AppError(
      400,
      'BIO_ENCODING_INVALID',
      'Noi dung bio co ky tu loi font. Vui long tai lai ban AI hoac nhap lai noi dung bang UTF-8.'
    );
  }
}

@Injectable()
export class ArtistBioService {
  constructor(private readonly prisma: PrismaService, private readonly authorizationService: AuthorizationService) {}
  private async assertCanManageConcert(user: AuthUser, concertId: string) {
    const allowed = await this.authorizationService.canManageConcert(user, concertId);
    if (!allowed) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Ban khong co quyen quan ly AI bio cua concert nay.');
    }
  }

  public async uploadPdf(params: {
    concertId: string;
    file: Express.Multer.File | undefined;
    createdBy?: string;
    user: AuthUser;
  }) {
    const { concertId, file, createdBy, user } = params;
    if (!file) {
      throw new AppError(400, 'PDF_FILE_REQUIRED', 'Vui long upload file PDF ho so nghe si.');
    }

    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Chi chap nhan file PDF.');
    }

    const concert = await this.prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Khong tim thay concert.');
    }
    await this.assertCanManageConcert(user, concertId);

    const objectKey = `artist-bio/${concertId}/${Date.now()}-${safeObjectName(file.originalname)}`;
    await uploadObject({
      bucket: ARTIST_BIO_BUCKET,
      key: objectKey,
      body: file.buffer,
      contentType: 'application/pdf',
    });

    const artistBio = await this.prisma.artistBio.create({
      data: {
        concertId,
        sourcePdfObjectKey: objectKey,
        sourcePdfFileName: file.originalname,
        status: 'PROCESSING',
        createdBy,
      },
    });

    await getAiBioQueue().add('processArtistBio', { artistBioId: artistBio.id });
    return artistBio;
  }

  public async getLatestByConcert(concertId: string, user: AuthUser) {
    const concert = await this.prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Khong tim thay concert.');
    }
    await this.assertCanManageConcert(user, concertId);

    return this.prisma.artistBio.findFirst({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async reviewBio(params: { artistBioId: string; reviewedBio: string; reviewedBy?: string; user: AuthUser }) {
    const { artistBioId, reviewedBio, reviewedBy, user } = params;
    if (!reviewedBio.trim()) {
      throw new AppError(400, 'BIO_CONTENT_REQUIRED', 'Noi dung bio da duyet khong duoc de trong.');
    }

    const artistBio = await this.prisma.artistBio.findUnique({ where: { id: artistBioId } });
    if (!artistBio) {
      throw new AppError(404, 'ARTIST_BIO_NOT_FOUND', 'Khong tim thay ban ghi AI bio.');
    }
    await this.assertCanManageConcert(user, artistBio.concertId);

    if (artistBio.status !== 'AI_GENERATED' && artistBio.status !== 'APPROVED') {
      throw new AppError(
        400,
        'INVALID_ARTIST_BIO_STATUS',
        'Chi co the duyet bio sau khi AI tao ban nhap thanh cong.'
      );
    }

    const normalizedReviewedBio = reviewedBio.trim();
    assertReadableVietnameseBio(normalizedReviewedBio);

    const reviewedArtistBio = await this.prisma.artistBio.update({
      where: { id: artistBioId },
      data: {
        reviewedBio: normalizedReviewedBio,
        reviewedBy,
        status: 'APPROVED',
      },
    });

    return reviewedArtistBio;
  }

  public async publishBio(artistBioId: string, user: AuthUser) {
    const artistBio = await this.prisma.artistBio.findUnique({ where: { id: artistBioId } });
    if (!artistBio) {
      throw new AppError(404, 'ARTIST_BIO_NOT_FOUND', 'Khong tim thay ban ghi AI bio.');
    }
    await this.assertCanManageConcert(user, artistBio.concertId);

    if (artistBio.status !== 'APPROVED' || !artistBio.reviewedBio) {
      throw new AppError(
        400,
        'ARTIST_BIO_NOT_APPROVED',
        'Chi co the publish bio da duoc duyet.'
      );
    }

    assertReadableVietnameseBio(artistBio.reviewedBio);

    await this.prisma.artistBio.updateMany({
      where: { concertId: artistBio.concertId, status: 'PUBLISHED' },
      data: { status: 'APPROVED', publishedAt: null },
    });

    const publishedBio = await this.prisma.artistBio.update({
      where: { id: artistBioId },
      data: {
        publishedBio: artistBio.reviewedBio,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    await invalidateConcertDetailCache(artistBio.concertId, 'artist-bio-published');
    return publishedBio;
  }
}
