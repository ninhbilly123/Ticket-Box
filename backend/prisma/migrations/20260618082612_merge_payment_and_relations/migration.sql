-- Add seat metadata needed by check-in screens.
ALTER TABLE "tickets" ADD COLUMN "seat_number" TEXT;

-- Add payment history records linked to orders.
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_gateway" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "response_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
