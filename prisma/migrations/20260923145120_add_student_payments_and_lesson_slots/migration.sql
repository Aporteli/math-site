-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "defaultMonthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "monthlyPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "parentPhone" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "lesson_slots" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,

    CONSTRAINT "lesson_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" VARCHAR(7) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod",
    "note" TEXT,
    "recordedById" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_slots_enrollmentId_idx" ON "lesson_slots"("enrollmentId");

-- CreateIndex
CREATE INDEX "lesson_slots_dayOfWeek_idx" ON "lesson_slots"("dayOfWeek");

-- CreateIndex
CREATE INDEX "payments_monthKey_idx" ON "payments"("monthKey");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_studentId_monthKey_key" ON "payments"("studentId", "monthKey");

-- AddForeignKey
ALTER TABLE "lesson_slots" ADD CONSTRAINT "lesson_slots_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
