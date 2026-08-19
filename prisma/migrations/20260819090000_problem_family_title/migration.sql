-- AlterTable
ALTER TABLE `problem_families` ADD COLUMN `title` VARCHAR(120) NOT NULL DEFAULT '';

UPDATE `problem_families` SET `title` = `slug` WHERE `title` = '';
