import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const region = process.env.MINIO_REGION || 'us-east-1';
const accessKeyId = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretAccessKey = process.env.MINIO_SECRET_KEY || 'minioadmin123';
const forcePathStyle = process.env.MINIO_FORCE_PATH_STYLE !== 'false';

export const ARTIST_BIO_BUCKET = process.env.ARTIST_BIO_BUCKET || 'artist-bio-source';
export const VIP_GUEST_IMPORT_BUCKET = process.env.VIP_GUEST_IMPORT_BUCKET || 'vip-guest-imports';
export const TICKET_ASSET_BUCKET = process.env.TICKET_ASSET_BUCKET || 'ticket-assets';

export const storageClient = new S3Client({
  endpoint,
  region,
  forcePathStyle,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function ensureBucket(bucket: string): Promise<void> {
  try {
    await storageClient.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await storageClient.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function uploadObject(params: {
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<string> {
  await ensureBucket(params.bucket);
  await storageClient.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  return params.key;
}

export async function getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
  const result = await storageClient.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) {
    return Buffer.alloc(0);
  }

  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function safeObjectName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
