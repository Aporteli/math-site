-- CreateTable
CREATE TABLE `problem_families` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `topic` VARCHAR(64) NOT NULL,
    `instructionId` VARCHAR(64) NOT NULL,
    `template` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `problem_families_authorId_slug_key`(`authorId`, `slug`),
    INDEX `problem_families_authorId_topic_idx`(`authorId`, `topic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `problem_families` ADD CONSTRAINT `problem_families_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
