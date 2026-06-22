import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { ARTIST_BIO_BUCKET, safeObjectName, uploadObject } from '../../shared/lib/storage';
import { getAiBioQueue } from '../../shared/lib/job-queues';
import { invalidateConcertDetailCache } from '../concert/concert-detail-cache';

export class ArtistBioService {
  public async uploadPdf(params: {
    concertId: string;
    file: Express.Multer.File | undefined;
    createdBy?: string;
  }) {
    const { concertId, file, createdBy } = params;
    if (!file) {
      throw new AppError(400, 'PDF_FILE_REQUIRED', 'Vui long upload file PDF ho so nghe si.');
    }

    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Chi chap nhan file PDF.');
    }

    const concert = await prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Khong tim thay concert.');
    }

    const objectKey = `artist-bio/${concertId}/${Date.now()}-${safeObjectName(file.originalname)}`;
    await uploadObject({
      bucket: ARTIST_BIO_BUCKET,
      key: objectKey,
      body: file.buffer,
      contentType: 'application/pdf',
    });

    const artistBio = await prisma.artistBio.create({
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

  public async getLatestByConcert(concertId: string) {
    const concert = await prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Khong tim thay concert.');
    }

    return prisma.artistBio.findFirst({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async reviewBio(params: { artistBioId: string; reviewedBio: string; reviewedBy?: string }) {
    const { artistBioId, reviewedBio, reviewedBy } = params;
    if (!reviewedBio.trim()) {
      throw new AppError(400, 'BIO_CONTENT_REQUIRED', 'Noi dung bio da duyet khong duoc de trong.');
    }

    const artistBio = await prisma.artistBio.findUnique({ where: { id: artistBioId } });
    if (!artistBio) {
      throw new AppError(404, 'ARTIST_BIO_NOT_FOUND', 'Khong tim thay ban ghi AI bio.');
    }

    if (artistBio.status !== 'AI_GENERATED' && artistBio.status !== 'APPROVED') {
      throw new AppError(
        400,
        'INVALID_ARTIST_BIO_STATUS',
        'Chi co the duyet bio sau khi AI tao ban nhap thanh cong.'
      );
    }

    const reviewedArtistBio = await prisma.artistBio.update({
      where: { id: artistBioId },
      data: {
        reviewedBio: reviewedBio.trim(),
        reviewedBy,
        status: 'APPROVED',
      },
    });

    return reviewedArtistBio;
  }

  public async publishBio(artistBioId: string) {
    const artistBio = await prisma.artistBio.findUnique({ where: { id: artistBioId } });
    if (!artistBio) {
      throw new AppError(404, 'ARTIST_BIO_NOT_FOUND', 'Khong tim thay ban ghi AI bio.');
    }

    if (artistBio.status !== 'APPROVED' || !artistBio.reviewedBio) {
      throw new AppError(
        400,
        'ARTIST_BIO_NOT_APPROVED',
        'Chi co the publish bio da duoc duyet.'
      );
    }

    await prisma.artistBio.updateMany({
      where: { concertId: artistBio.concertId, status: 'PUBLISHED' },
      data: { status: 'APPROVED', publishedAt: null },
    });

    const publishedBio = await prisma.artistBio.update({
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
