-- CreateTable
CREATE TABLE `taxonomy_nodes` (
    `id` VARCHAR(191) NOT NULL,
    `level` ENUM('branch', 'topic', 'subtopic', 'concept') NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `nameKa` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `nameRu` VARCHAR(120) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `taxonomy_nodes_level_parentId_idx`(`level`, `parentId`),
    INDEX `taxonomy_nodes_sortOrder_idx`(`sortOrder`),
    UNIQUE INDEX `taxonomy_nodes_parentId_slug_key`(`parentId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `problems` ADD COLUMN `branchId` VARCHAR(191) NULL,
    ADD COLUMN `topicNodeId` VARCHAR(191) NULL,
    ADD COLUMN `subtopicId` VARCHAR(191) NULL,
    ADD COLUMN `conceptId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `problems_branchId_idx` ON `problems`(`branchId`);
CREATE INDEX `problems_topicNodeId_idx` ON `problems`(`topicNodeId`);
CREATE INDEX `problems_subtopicId_idx` ON `problems`(`subtopicId`);
CREATE INDEX `problems_conceptId_idx` ON `problems`(`conceptId`);

-- AddForeignKey
ALTER TABLE `taxonomy_nodes` ADD CONSTRAINT `taxonomy_nodes_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `taxonomy_nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `problems` ADD CONSTRAINT `problems_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `taxonomy_nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `problems` ADD CONSTRAINT `problems_topicNodeId_fkey` FOREIGN KEY (`topicNodeId`) REFERENCES `taxonomy_nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `problems` ADD CONSTRAINT `problems_subtopicId_fkey` FOREIGN KEY (`subtopicId`) REFERENCES `taxonomy_nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `problems` ADD CONSTRAINT `problems_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `taxonomy_nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
