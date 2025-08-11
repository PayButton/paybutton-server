/*
  Warnings:

  - You are about to drop the column `sendEmail` on the `PaybuttonTrigger` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PaybuttonTrigger` DROP COLUMN `sendEmail`,
    ADD COLUMN `emails` TEXT NOT NULL DEFAULT '',
    ADD COLUMN `isEmailTrigger` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `UserProfile` ADD COLUMN `emailCredits` INTEGER NOT NULL DEFAULT 100;
