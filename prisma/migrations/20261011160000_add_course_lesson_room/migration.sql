CREATE TABLE "course_lesson_rooms" (
    "courseId" TEXT NOT NULL,
    "meetUrl" VARCHAR(300),
    "meetSpaceName" VARCHAR(200),
    "miroBoardId" VARCHAR(128),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_lesson_rooms_pkey" PRIMARY KEY ("courseId")
);

ALTER TABLE "course_lesson_rooms" ADD CONSTRAINT "course_lesson_rooms_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
