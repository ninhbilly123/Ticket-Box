import { Queue, Worker, Job } from 'bullmq';
import { PDFParse } from 'pdf-parse';
import { prisma } from '../shared/lib/prisma';
import { ARTIST_BIO_BUCKET, getObjectBuffer } from '../shared/lib/storage';
import { generateVietnameseArtistBio } from '../shared/lib/gemini';
import { queueConnection } from '../shared/lib/queue';

export const aiBioQueue = new Queue('aiBioQueue', { connection: queueConnection });

function cleanPdfText(rawText: string): string {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const aiBioWorker = new Worker(
  'aiBioQueue',
  async (job: Job<{ artistBioId: string }>) => {
    const { artistBioId } = job.data;
    const artistBio = await prisma.artistBio.findUnique({ where: { id: artistBioId } });
    if (!artistBio) {
      return;
    }

    try {
      await prisma.artistBio.update({
        where: { id: artistBioId },
        data: { status: 'PROCESSING', errorMessage: null },
      });

      const pdfBuffer = await getObjectBuffer(ARTIST_BIO_BUCKET, artistBio.sourcePdfObjectKey);
      const parser = new PDFParse({ data: pdfBuffer });
      const parsed = await parser.getText();
      await parser.destroy();
      const rawText = parsed.text || '';
      const cleanedText = cleanPdfText(rawText);

      if (!cleanedText) {
        throw new Error('PDF_TEXT_EXTRACTION_FAILED');
      }

      const generatedBio = await generateVietnameseArtistBio(cleanedText);
      await prisma.artistBio.update({
        where: { id: artistBioId },
        data: {
          rawText,
          cleanedText,
          generatedBio,
          status: 'AI_GENERATED',
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI bio processing failed';
      await prisma.artistBio.update({
        where: { id: artistBioId },
        data: {
          status: 'FAILED',
          errorMessage: message,
        },
      });
      throw error;
    }
  },
  { connection: queueConnection }
);

aiBioWorker.on('failed', (job, err) => {
  console.error(`[AiBioWorker] Job ${job?.id} failed:`, err);
});

export function startAiBioWorker() {
  console.log('[AiBioWorker] Initialized');
}
