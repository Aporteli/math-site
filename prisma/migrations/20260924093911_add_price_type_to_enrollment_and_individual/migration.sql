-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'PER_LESSON');

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "priceType" "PriceType" NOT NULL DEFAULT 'MONTHLY';
