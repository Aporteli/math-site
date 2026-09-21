-- CreateTable
CREATE TABLE "course_whiteboards" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "currentPageIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_whiteboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_whiteboards_courseId_key" ON "course_whiteboards"("courseId");

-- CreateIndex
CREATE INDEX "course_whiteboards_courseId_idx" ON "course_whiteboards"("courseId");

-- AddForeignKey
ALTER TABLE "course_whiteboards" ADD CONSTRAINT "course_whiteboards_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
