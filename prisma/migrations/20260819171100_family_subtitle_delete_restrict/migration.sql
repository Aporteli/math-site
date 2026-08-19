-- Deleting a subtitle must not cascade to the parent family.
ALTER TABLE `problem_families` DROP FOREIGN KEY `problem_families_parentId_fkey`;

ALTER TABLE `problem_families` ADD CONSTRAINT `problem_families_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `problem_families`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
