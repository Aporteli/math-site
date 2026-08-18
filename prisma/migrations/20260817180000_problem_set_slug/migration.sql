-- AlterTable
ALTER TABLE `problem_sets` ADD COLUMN `slug` VARCHAR(191) NOT NULL DEFAULT 'lesson-draft';

-- CreateIndex
CREATE UNIQUE INDEX `problem_sets_authorId_slug_key` ON `problem_sets`(`authorId`, `slug`);
