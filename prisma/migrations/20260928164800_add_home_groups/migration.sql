-- CreateTable
CREATE TABLE "home_groups" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "individual_students" ADD COLUMN "homeGroupId" TEXT;

-- CreateIndex
CREATE INDEX "home_groups_teacherId_idx" ON "home_groups"("teacherId");

-- CreateIndex
CREATE INDEX "individual_students_homeGroupId_idx" ON "individual_students"("homeGroupId");

-- AddForeignKey
ALTER TABLE "home_groups" ADD CONSTRAINT "home_groups_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_students" ADD CONSTRAINT "individual_students_homeGroupId_fkey" FOREIGN KEY ("homeGroupId") REFERENCES "home_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
