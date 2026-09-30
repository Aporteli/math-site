CREATE TABLE "public"."teacher_boards" (
    "userId" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "currentPageIndex" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_boards_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "public"."teacher_boards" ADD CONSTRAINT "teacher_boards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
