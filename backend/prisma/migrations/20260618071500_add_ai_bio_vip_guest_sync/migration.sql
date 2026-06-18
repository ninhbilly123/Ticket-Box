-- Add missing columns from current payment/e-ticket schema.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key" ON "orders"("idempotency_key");

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "qr_token" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "is_checked_in" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_qr_token_key" ON "tickets"("qr_token");

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "payment_gateway" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "transaction_id" TEXT,
  "response_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Concert event code used by CSV guest imports.
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "event_code" TEXT;
UPDATE "concerts"
SET "event_code" = 'EVENT-' || upper(substr("id", 1, 8))
WHERE "event_code" IS NULL;
ALTER TABLE "concerts" ALTER COLUMN "event_code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "concerts_event_code_key" ON "concerts"("event_code");

DO $$ BEGIN
  CREATE TYPE "ArtistBioStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'AI_GENERATED', 'APPROVED', 'PUBLISHED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "VipGuestStatus" AS ENUM ('VALID', 'USED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GuestImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'NO_FILE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "artist_bios" (
  "id" TEXT NOT NULL,
  "concert_id" TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS "artist_bios_concert_id_status_idx" ON "artist_bios"("concert_id", "status");

DO $$ BEGIN
  ALTER TABLE "artist_bios" ADD CONSTRAINT "artist_bios_concert_id_fkey"
  FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "sponsor_emails" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "allowed_event_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sponsor_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sponsor_emails_email_key" ON "sponsor_emails"("email");

CREATE TABLE IF NOT EXISTS "guest_import_jobs" (
  "id" TEXT NOT NULL,
  "concert_id" TEXT,
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

CREATE INDEX IF NOT EXISTS "guest_import_jobs_status_created_at_idx" ON "guest_import_jobs"("status", "created_at");

DO $$ BEGIN
  ALTER TABLE "guest_import_jobs" ADD CONSTRAINT "guest_import_jobs_concert_id_fkey"
  FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "vip_guests" (
  "id" TEXT NOT NULL,
  "concert_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "note" TEXT,
  "source_import_id" TEXT,
  "qr_token" TEXT,
  "ticket_status" "VipGuestStatus" NOT NULL DEFAULT 'VALID',
  "email_status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "email_error" TEXT,
  "checked_in_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vip_guests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vip_guests_qr_token_key" ON "vip_guests"("qr_token");
CREATE UNIQUE INDEX IF NOT EXISTS "vip_guests_concert_id_email_key" ON "vip_guests"("concert_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "vip_guests_concert_id_phone_key" ON "vip_guests"("concert_id", "phone");
CREATE INDEX IF NOT EXISTS "vip_guests_concert_id_idx" ON "vip_guests"("concert_id");

DO $$ BEGIN
  ALTER TABLE "vip_guests" ADD CONSTRAINT "vip_guests_concert_id_fkey"
  FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "vip_guests" ADD CONSTRAINT "vip_guests_source_import_id_fkey"
  FOREIGN KEY ("source_import_id") REFERENCES "guest_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "guest_import_row_errors" (
  "id" TEXT NOT NULL,
  "guest_import_job_id" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "raw_data" JSONB,
  "error_code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_import_row_errors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guest_import_row_errors_guest_import_job_id_idx" ON "guest_import_row_errors"("guest_import_job_id");

DO $$ BEGIN
  ALTER TABLE "guest_import_row_errors" ADD CONSTRAINT "guest_import_row_errors_guest_import_job_id_fkey"
  FOREIGN KEY ("guest_import_job_id") REFERENCES "guest_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
