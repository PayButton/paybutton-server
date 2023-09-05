/*
  Warnings:

  - Made the column `providerUserId` on table `Paybutton` required. This step will fail if there are existing NULL values in that column.
  - Made the column `providerUserId` on table `Wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Paybutton` MODIFY `providerUserId` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `Wallet` MODIFY `providerUserId` VARCHAR(255) NOT NULL;
