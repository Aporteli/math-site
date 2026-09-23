-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."AssignmentType" AS ENUM ('FLASHCARD', 'PROBLEM', 'HOMEWORK', 'QUIZ');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."ProblemCollection" AS ENUM ('bank', 'lab');

-- CreateEnum
CREATE TYPE "public"."ProblemDifficulty" AS ENUM ('easy', 'medium', 'hard', 'olympiad');

-- CreateEnum
CREATE TYPE "public"."ProblemSource" AS ENUM ('bank', 'generated', 'ai', 'custom');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'VISITOR');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "public"."TaxonomyLevel" AS ENUM ('branch', 'topic', 'subtopic', 'concept');

-- CreateEnum
CREATE TYPE "public"."WhiteboardAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."YearGroup" AS ENUM ('YEAR_7', 'YEAR_8', 'YEAR_9', 'YEAR_10', 'YEAR_11', 'YEAR_12');

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "problemSetId" TEXT,
    "targetUserId" TEXT,
    "type" "public"."AssignmentType" NOT NULL DEFAULT 'PROBLEM',
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "customPayload" JSONB,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_whiteboards" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "currentPageIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_whiteboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inviteCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "yearGroup" "public"."YearGroup" NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grades" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "graderId" TEXT NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "comment" TEXT,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."journal_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '10:00',
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "guests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT NOT NULL DEFAULT 'navy',
    "repeat" TEXT NOT NULL DEFAULT 'none',
    "reminder" TEXT NOT NULL DEFAULT '30',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson_notes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."problem_families" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "topic" VARCHAR(64) NOT NULL,
    "instructionId" VARCHAR(64) NOT NULL,
    "template" JSONB NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."problem_set_items" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "problem_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."problem_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."problems" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "topic" VARCHAR(64) NOT NULL,
    "difficulty" "public"."ProblemDifficulty" NOT NULL,
    "yearGroup" "public"."YearGroup",
    "source" "public"."ProblemSource" NOT NULL,
    "collection" "public"."ProblemCollection" NOT NULL DEFAULT 'bank',
    "originId" TEXT,
    "instructionId" TEXT NOT NULL,
    "promptTex" TEXT NOT NULL,
    "solutionTex" TEXT NOT NULL,
    "seed" INTEGER,
    "graphExpr" TEXT,
    "kind" TEXT,
    "formula" TEXT,
    "variables" JSONB,
    "promptTemplate" TEXT,
    "branchId" TEXT,
    "topicNodeId" TEXT,
    "subtopicId" TEXT,
    "conceptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "answers" JSONB,
    "attachmentUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."taxonomy_nodes" (
    "id" TEXT NOT NULL,
    "level" "public"."TaxonomyLevel" NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "nameKa" VARCHAR(120) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "nameRu" VARCHAR(120) NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomy_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'VISITOR',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whiteboard_assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "public"."WhiteboardAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whiteboard_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_courseId_status_idx" ON "public"."assignments"("courseId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "assignments_problemSetId_idx" ON "public"."assignments"("problemSetId" ASC);

-- CreateIndex
CREATE INDEX "assignments_targetUserId_idx" ON "public"."assignments"("targetUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_courseId_studentId_date_key" ON "public"."attendance"("courseId" ASC, "studentId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "attendance_studentId_idx" ON "public"."attendance"("studentId" ASC);

-- CreateIndex
CREATE INDEX "comments_assignmentId_idx" ON "public"."comments"("assignmentId" ASC);

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "public"."comments"("authorId" ASC);

-- CreateIndex
CREATE INDEX "course_whiteboards_courseId_idx" ON "public"."course_whiteboards"("courseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "course_whiteboards_courseId_key" ON "public"."course_whiteboards"("courseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "courses_inviteCode_key" ON "public"."courses"("inviteCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "public"."courses"("slug" ASC);

-- CreateIndex
CREATE INDEX "courses_teacherId_idx" ON "public"."courses"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "enrollments_courseId_idx" ON "public"."enrollments"("courseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_courseId_key" ON "public"."enrollments"("userId" ASC, "courseId" ASC);

-- CreateIndex
CREATE INDEX "grades_graderId_idx" ON "public"."grades"("graderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "grades_submissionId_key" ON "public"."grades"("submissionId" ASC);

-- CreateIndex
CREATE INDEX "journal_events_userId_date_idx" ON "public"."journal_events"("userId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "lesson_notes_courseId_date_idx" ON "public"."lesson_notes"("courseId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "problem_families_authorId_parentId_idx" ON "public"."problem_families"("authorId" ASC, "parentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "problem_families_authorId_slug_key" ON "public"."problem_families"("authorId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "problem_families_authorId_topic_idx" ON "public"."problem_families"("authorId" ASC, "topic" ASC);

-- CreateIndex
CREATE INDEX "problem_set_items_problemId_idx" ON "public"."problem_set_items"("problemId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "problem_set_items_setId_problemId_key" ON "public"."problem_set_items"("setId" ASC, "problemId" ASC);

-- CreateIndex
CREATE INDEX "problem_sets_authorId_idx" ON "public"."problem_sets"("authorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "problem_sets_authorId_slug_key" ON "public"."problem_sets"("authorId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "problem_sets_courseId_idx" ON "public"."problem_sets"("courseId" ASC);

-- CreateIndex
CREATE INDEX "problems_authorId_collection_idx" ON "public"."problems"("authorId" ASC, "collection" ASC);

-- CreateIndex
CREATE INDEX "problems_authorId_collection_originId_idx" ON "public"."problems"("authorId" ASC, "collection" ASC, "originId" ASC);

-- CreateIndex
CREATE INDEX "problems_authorId_topic_difficulty_idx" ON "public"."problems"("authorId" ASC, "topic" ASC, "difficulty" ASC);

-- CreateIndex
CREATE INDEX "problems_branchId_idx" ON "public"."problems"("branchId" ASC);

-- CreateIndex
CREATE INDEX "problems_conceptId_idx" ON "public"."problems"("conceptId" ASC);

-- CreateIndex
CREATE INDEX "problems_subtopicId_idx" ON "public"."problems"("subtopicId" ASC);

-- CreateIndex
CREATE INDEX "problems_topicNodeId_idx" ON "public"."problems"("topicNodeId" ASC);

-- CreateIndex
CREATE INDEX "problems_yearGroup_source_idx" ON "public"."problems"("yearGroup" ASC, "source" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignmentId_studentId_key" ON "public"."submissions"("assignmentId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "submissions_studentId_idx" ON "public"."submissions"("studentId" ASC);

-- CreateIndex
CREATE INDEX "taxonomy_nodes_level_parentId_idx" ON "public"."taxonomy_nodes"("level" ASC, "parentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_nodes_parentId_slug_key" ON "public"."taxonomy_nodes"("parentId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "taxonomy_nodes_sortOrder_idx" ON "public"."taxonomy_nodes"("sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "verification_tokens_email_idx" ON "public"."verification_tokens"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_email_token_key" ON "public"."verification_tokens"("email" ASC, "token" ASC);

-- CreateIndex
CREATE INDEX "whiteboard_assignments_courseId_idx" ON "public"."whiteboard_assignments"("courseId" ASC);

-- CreateIndex
CREATE INDEX "whiteboard_assignments_studentId_idx" ON "public"."whiteboard_assignments"("studentId" ASC);

-- CreateIndex
CREATE INDEX "whiteboard_assignments_teacherId_idx" ON "public"."whiteboard_assignments"("teacherId" ASC);

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_problemSetId_fkey" FOREIGN KEY ("problemSetId") REFERENCES "public"."problem_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_whiteboards" ADD CONSTRAINT "course_whiteboards_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grades" ADD CONSTRAINT "grades_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grades" ADD CONSTRAINT "grades_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."journal_events" ADD CONSTRAINT "journal_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_notes" ADD CONSTRAINT "lesson_notes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_notes" ADD CONSTRAINT "lesson_notes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_families" ADD CONSTRAINT "problem_families_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_families" ADD CONSTRAINT "problem_families_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."problem_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_set_items" ADD CONSTRAINT "problem_set_items_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_set_items" ADD CONSTRAINT "problem_set_items_setId_fkey" FOREIGN KEY ("setId") REFERENCES "public"."problem_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_sets" ADD CONSTRAINT "problem_sets_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problem_sets" ADD CONSTRAINT "problem_sets_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problems" ADD CONSTRAINT "problems_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problems" ADD CONSTRAINT "problems_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."taxonomy_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problems" ADD CONSTRAINT "problems_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "public"."taxonomy_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problems" ADD CONSTRAINT "problems_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "public"."taxonomy_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."problems" ADD CONSTRAINT "problems_topicNodeId_fkey" FOREIGN KEY ("topicNodeId") REFERENCES "public"."taxonomy_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."taxonomy_nodes" ADD CONSTRAINT "taxonomy_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."taxonomy_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whiteboard_assignments" ADD CONSTRAINT "whiteboard_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whiteboard_assignments" ADD CONSTRAINT "whiteboard_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whiteboard_assignments" ADD CONSTRAINT "whiteboard_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
