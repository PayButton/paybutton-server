-- CreateTable
CREATE TABLE `ClientPayment` (
    `paymentId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ADDED_TO_MEMPOOL', 'CONFIRMED') NOT NULL,
    `addressString` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`paymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientPayment` ADD CONSTRAINT `ClientPayment_addressString_fkey` FOREIGN KEY (`addressString`) REFERENCES `Address`(`address`) ON DELETE RESTRICT ON UPDATE CASCADE;
