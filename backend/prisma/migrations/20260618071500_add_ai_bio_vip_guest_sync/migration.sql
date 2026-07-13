-- AI artist bio and one-way VIP guest synchronization.

ALTER TABLE "concerts" ADD COLUMN "event_code" TEXT;
UPDATE "concerts"
SET "event_code" = 'EVENT-' || upper(substr("id"::text, 1, 8));
ALTER TABLE "concerts" ALTER COLUMN "event_code" SET NOT NULL;
CREATE UNIQUE INDEX "concerts_event_code_key" ON "concerts"("event_code");

CREATE TYPE "ArtistBioStatus" AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'AI_GENERATED',
  'APPROVED',
  'PUBLISHED',
  'FAILED'
);

CREATE TYPE "VipGuestStatus" AS ENUM ('VALID', 'USED', 'CANCELLED');
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "GuestImportStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED',
  'NO_FILE'
);

CREATE TABLE "artist_bios" (
  "id" UUID NOT NULL,
  "concert_id" UUID NOT NULL,
  "source_pdf_object_key" TEXT NOT NULL,
  "source_pdf_file_name" TEXT,
  "status" "ArtistBioStatus" NOT NULL DEFAULT 'UPLOADED',
  "raw_text" TEXT,
  "cleaned_text" TEXT,
  "generated_bio" TEXT,
  "reviewed_bio" TEXT,
  "published_bio" TEXT,
  "error_message" TEXT,
  "created_by" TEXT,
  "reviewed_by" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artist_bios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "artist_bios_concert_id_status_idx"
ON "artist_bios"("concert_id", "status");

ALTER TABLE "artist_bios"
ADD CONSTRAINT "artist_bios_concert_id_fkey"
FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "sponsor_emails" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "allowed_event_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sponsor_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sponsor_emails_email_key" ON "sponsor_emails"("email");

CREATE TABLE "guest_import_jobs" (
  "id" UUID NOT NULL,
  "concert_id" UUID,
  "status" "GuestImportStatus" NOT NULL DEFAULT 'PENDING',
  "sender_email" TEXT,
  "mailbox_message_id" TEXT,
  "original_file_name" TEXT,
  "object_key" TEXT,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "success_rows" INTEGER NOT NULL DEFAULT 0,
  "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "email_sent_rows" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guest_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "guest_import_jobs_status_created_at_idx"
ON "guest_import_jobs"("status", "created_at");

ALTER TABLE "guest_import_jobs"
ADD CONSTRAINT "guest_import_jobs_concert_id_fkey"
FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend the existing check-in VIP guest table instead of replacing it.
ALTER TABLE "vip_guests" ALTER COLUMN "identifier" DROP NOT NULL;
ALTER TABLE "vip_guests" ALTER COLUMN "zone" SET DEFAULT 'VIP';
ALTER TABLE "vip_guests"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "company" TEXT,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "source_import_id" UUID,
  ADD COLUMN "qr_token" TEXT,
  ADD COLUMN "ticket_status" "VipGuestStatus" NOT NULL DEFAULT 'VALID',
  ADD COLUMN "email_status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "email_error" TEXT,
  ADD COLUMN "checked_in_at" TIMESTAMP(3),
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "vip_guests_qr_token_key" ON "vip_guests"("qr_token");
CREATE UNIQUE INDEX "vip_guests_concert_id_email_key" ON "vip_guests"("concert_id", "email");
CREATE UNIQUE INDEX "vip_guests_concert_id_phone_key" ON "vip_guests"("concert_id", "phone");
CREATE INDEX "vip_guests_concert_id_idx" ON "vip_guests"("concert_id");

ALTER TABLE "vip_guests"
ADD CONSTRAINT "vip_guests_source_import_id_fkey"
FOREIGN KEY ("source_import_id") REFERENCES "guest_import_jobs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "guest_import_row_errors" (
  "id" UUID NOT NULL,
  "guest_import_job_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "raw_data" JSONB,
  "error_code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_import_row_errors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "guest_import_row_errors_guest_import_job_id_idx"
ON "guest_import_row_errors"("guest_import_job_id");

ALTER TABLE "guest_import_row_errors"
ADD CONSTRAINT "guest_import_row_errors_guest_import_job_id_fkey"
FOREIGN KEY ("guest_import_job_id") REFERENCES "guest_import_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
