-- CreateTable
CREATE TABLE `TransactionInput` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `transactionId` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `index` INTEGER NOT NULL,
    `amount` DECIMAL(24, 8) NOT NULL,

    INDEX `TransactionInput_transactionId_idx`(`transactionId`),
    INDEX `TransactionInput_addressId_idx`(`addressId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransactionOutput` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `transactionId` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `index` INTEGER NOT NULL,
    `amount` DECIMAL(24, 8) NOT NULL,

    INDEX `TransactionOutput_transactionId_idx`(`transactionId`),
    INDEX `TransactionOutput_addressId_idx`(`addressId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TransactionInput` ADD CONSTRAINT `TransactionInput_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionInput` ADD CONSTRAINT `TransactionInput_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionOutput` ADD CONSTRAINT `TransactionOutput_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionOutput` ADD CONSTRAINT `TransactionOutput_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
