/*
  Warnings:

  - A unique constraint covering the columns `[hash,addressId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Transaction_hash_key` ON `Transaction`;

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_hash_addressId_key` ON `Transaction`(`hash`, `addressId`);
