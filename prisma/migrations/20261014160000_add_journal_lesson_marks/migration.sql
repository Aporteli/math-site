CREATE TABLE "journal_lesson_marks" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "skippedStudentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_lesson_marks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "journal_lesson_marks_teacherId_idx" ON "journal_lesson_marks"("teacherId");

CREATE UNIQUE INDEX "journal_lesson_marks_teacherId_eventId_date_key" ON "journal_lesson_marks"("teacherId", "eventId", "date");

ALTER TABLE "journal_lesson_marks" ADD CONSTRAINT "journal_lesson_marks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
