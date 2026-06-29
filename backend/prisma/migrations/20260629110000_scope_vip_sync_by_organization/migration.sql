ALTER TABLE "sponsor_emails" ADD COLUMN "organization_id" UUID;
ALTER TABLE "guest_import_jobs" ADD COLUMN "organization_id" UUID;

ALTER TABLE "sponsor_emails"
  ADD CONSTRAINT "sponsor_emails_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_import_jobs"
  ADD CONSTRAINT "guest_import_jobs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sponsor_emails_organization_id_idx" ON "sponsor_emails"("organization_id");
CREATE INDEX "guest_import_jobs_organization_id_idx" ON "guest_import_jobs"("organization_id");
