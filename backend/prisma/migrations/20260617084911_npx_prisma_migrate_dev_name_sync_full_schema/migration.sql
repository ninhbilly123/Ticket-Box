/*
  Warnings:

  - The primary key for the `concerts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `artist` on the `concerts` table. All the data in the column will be lost.
  - You are about to drop the column `date_time` on the `concerts` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `concerts` table. All the data in the column will be lost.
  - You are about to drop the column `seat_map_url` on the `concerts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `concerts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `concerts` table. All the data in the column will be lost.
  - The primary key for the `orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updated_at` on the `orders` table. All the data in the column will be lost.
  - The primary key for the `ticket_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `ticket_types` table. All the data in the column will be lost.
  - You are about to drop the column `max_limit_per_user` on the `ticket_types` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ticket_types` table. All the data in the column will be lost.
  - The primary key for the `tickets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `seat_number` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `ticket_type_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tickets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotency_key]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qr_code]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizer_id` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sale_open_at` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_at` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `venue` to the `concerts` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `concerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `idempotency_key` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `concert_id` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `max_per_account` to the `ticket_types` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `ticket_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `concert_id` on the `ticket_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `order_item_id` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qr_code` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_concert_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_types" DROP CONSTRAINT "ticket_types_concert_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_order_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_ticket_type_id_fkey";

-- AlterTable
ALTER TABLE "concerts" DROP CONSTRAINT "concerts_pkey",
DROP COLUMN "artist",
DROP COLUMN "date_time",
DROP COLUMN "location",
DROP COLUMN "seat_map_url",
DROP COLUMN "title",
DROP COLUMN "updated_at",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "organizer_id" UUID NOT NULL,
ADD COLUMN     "sale_open_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "svg_seating_map" TEXT,
ADD COLUMN     "venue" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "concerts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "orders" DROP CONSTRAINT "orders_pkey",
DROP COLUMN "updated_at",
ADD COLUMN     "idempotency_key" TEXT NOT NULL,
ADD COLUMN     "paid_at" TIMESTAMP(3),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "concert_id",
ADD COLUMN     "concert_id" UUID NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ticket_types" DROP CONSTRAINT "ticket_types_pkey",
DROP COLUMN "created_at",
DROP COLUMN "max_limit_per_user",
DROP COLUMN "updated_at",
ADD COLUMN     "max_per_account" INTEGER NOT NULL,
ADD COLUMN     "sale_close_at" TIMESTAMP(3),
ADD COLUMN     "sale_open_at" TIMESTAMP(3),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "concert_id",
ADD COLUMN     "concert_id" UUID NOT NULL,
ADD CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_pkey",
DROP COLUMN "created_at",
DROP COLUMN "order_id",
DROP COLUMN "seat_number",
DROP COLUMN "ticket_type_id",
DROP COLUMN "updated_at",
ADD COLUMN     "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order_item_id" UUID NOT NULL,
ADD COLUMN     "qr_code" TEXT NOT NULL,
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "TicketStatus";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bio_generated" TEXT,
    "pdf_source_url" TEXT,
    "bio_updated_at" TIMESTAMP(3),

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concert_artists" (
    "concert_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,

    CONSTRAINT "concert_artists_pkey" PRIMARY KEY ("concert_id","artist_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_logs" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "gate_staff_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at_local" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "checkin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_guests" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "csv_batch_id" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_code_key" ON "tickets"("qr_code");

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_artists" ADD CONSTRAINT "concert_artists_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_artists" ADD CONSTRAINT "concert_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_logs" ADD CONSTRAINT "checkin_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_logs" ADD CONSTRAINT "checkin_logs_gate_staff_id_fkey" FOREIGN KEY ("gate_staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_guests" ADD CONSTRAINT "vip_guests_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
