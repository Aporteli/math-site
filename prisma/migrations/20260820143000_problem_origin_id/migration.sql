-- AlterTable
ALTER TABLE `problems` ADD COLUMN `originId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `problems_authorId_collection_originId_idx` ON `problems`(`authorId`, `collection`, `originId`);
