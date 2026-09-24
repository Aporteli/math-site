-- CreateTable
CREATE TABLE "individual_students" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "parentPhone" TEXT,
    "email" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_lessons" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,

    CONSTRAINT "individual_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthKey" VARCHAR(7) NOT NULL,
    "method" "PaymentMethod",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "individual_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "individual_students_teacherId_idx" ON "individual_students"("teacherId");

-- CreateIndex
CREATE INDEX "individual_lessons_studentId_idx" ON "individual_lessons"("studentId");

-- CreateIndex
CREATE INDEX "individual_payments_studentId_monthKey_idx" ON "individual_payments"("studentId", "monthKey");

-- CreateIndex
CREATE INDEX "individual_payments_studentId_paidAt_idx" ON "individual_payments"("studentId", "paidAt");

-- AddForeignKey
ALTER TABLE "individual_students" ADD CONSTRAINT "individual_students_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_lessons" ADD CONSTRAINT "individual_lessons_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "individual_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_payments" ADD CONSTRAINT "individual_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "individual_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
