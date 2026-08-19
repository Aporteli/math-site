-- AlterTable
ALTER TABLE `problem_families` ADD COLUMN `parentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `problem_families_authorId_parentId_idx` ON `problem_families`(`authorId`, `parentId`);

-- AddForeignKey
ALTER TABLE `problem_families` ADD CONSTRAINT `problem_families_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `problem_families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
