/*
  Warnings:

  - You are about to alter the column `value` on the `Price` table. The data in that column could be lost. The data in that column will be cast from `Decimal(36,8)` to `Decimal(36,14)`.

*/
-- AlterTable
ALTER TABLE `Price` MODIFY `value` DECIMAL(36, 14) NOT NULL;
