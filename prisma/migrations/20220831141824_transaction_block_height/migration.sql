/*
  Warnings:

  - Added the required column `blockHeight` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `blockHeight` INTEGER NOT NULL;
