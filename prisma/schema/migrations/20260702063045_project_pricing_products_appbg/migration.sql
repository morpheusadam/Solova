-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('GOOD', 'SERVICE');

-- AlterEnum
ALTER TYPE "invoice_line_source" ADD VALUE 'PRODUCT';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "billing_model" "billing_model",
ADD COLUMN     "currency_code" CHAR(3),
ADD COLUMN     "rate_minor" BIGINT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "app_background" TEXT;

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "product_type" NOT NULL DEFAULT 'SERVICE',
    "unit_price_minor" BIGINT NOT NULL DEFAULT 0,
    "currency_code" CHAR(3),
    "tax_rate_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "income_account_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_income_account_id_fkey" FOREIGN KEY ("income_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
