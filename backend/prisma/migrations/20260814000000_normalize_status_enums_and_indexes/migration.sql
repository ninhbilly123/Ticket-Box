-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AUDIENCE', 'ORGANIZER', 'CHECKIN_STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConcertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ON_SALE', 'SALE_CLOSED', 'CANCELLED', 'published');

-- CreateEnum
CREATE TYPE "TicketTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'expired', 'PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('valid', 'used', 'cancelled', 'VALID', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "WhitelistConfigStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus" USING ("status"::"UserStatus");
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "concerts" ALTER COLUMN "status" TYPE "ConcertStatus" USING ("status"::"ConcertStatus");

-- AlterTable
ALTER TABLE "ticket_types" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ticket_types" ALTER COLUMN "status" TYPE "TicketTypeStatus" USING ("status"::"TicketTypeStatus");
ALTER TABLE "ticket_types" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::"OrderStatus");

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus" USING ("status"::"TicketStatus");

-- AlterTable
ALTER TABLE "whitelist_email_configs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "whitelist_email_configs" ALTER COLUMN "status" TYPE "WhitelistConfigStatus" USING ("status"::"WhitelistConfigStatus");
ALTER TABLE "whitelist_email_configs" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "NotificationStatus" USING ("status"::"NotificationStatus");

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus" USING ("status"::"PaymentStatus");
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "concerts_organization_id_idx" ON "concerts"("organization_id");

-- CreateIndex
CREATE INDEX "concerts_organizer_id_idx" ON "concerts"("organizer_id");

-- CreateIndex
CREATE INDEX "concerts_status_start_at_idx" ON "concerts"("status", "start_at");

-- CreateIndex
CREATE INDEX "concerts_start_at_idx" ON "concerts"("start_at");

-- CreateIndex
CREATE INDEX "ticket_types_status_idx" ON "ticket_types"("status");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_concert_id_status_idx" ON "orders"("concert_id", "status");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_ticket_type_id_idx" ON "order_items"("ticket_type_id");

-- CreateIndex
CREATE INDEX "tickets_order_item_id_idx" ON "tickets"("order_item_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "checkin_logs_ticket_id_idx" ON "checkin_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "checkin_logs_gate_staff_id_idx" ON "checkin_logs"("gate_staff_id");

-- CreateIndex
CREATE INDEX "checkin_logs_synced_at_idx" ON "checkin_logs"("synced_at");

-- CreateIndex
CREATE INDEX "whitelist_email_configs_status_idx" ON "whitelist_email_configs"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_concert_id_idx" ON "notifications"("concert_id");

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
