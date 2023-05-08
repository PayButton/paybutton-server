-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `address` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastSynced` DATETIME(3) NULL,
    `networkId` INTEGER NOT NULL,

    UNIQUE INDEX `Address_address_key`(`address`),
    INDEX `Address_networkId_fkey`(`networkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paybutton` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `name` VARCHAR(255) NOT NULL,
    `buttonData` LONGTEXT NOT NULL,
    `providerUserId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Paybutton_name_providerUserId_unique_constraint`(`name`, `providerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AddressesOnButtons` (
    `paybuttonId` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`paybuttonId`, `addressId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Network` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `ticker` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Network_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `hash` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(24, 8) NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `confirmed` BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE INDEX `Transaction_hash_addressId_key`(`hash`, `addressId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Wallet` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `providerUserId` VARCHAR(255) NULL,

    UNIQUE INDEX `Wallet_name_providerUserId_unique_constraint`(`name`, `providerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserProfile` (
    `id` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletsOnUserProfile` (
    `walletId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isXECDefault` BOOLEAN NULL,
    `isBCHDefault` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WalletsOnUserProfile_walletId_key`(`walletId`),
    UNIQUE INDEX `WalletsOnUserProfile_userId_isXECDefault_key`(`userId`, `isXECDefault`),
    UNIQUE INDEX `WalletsOnUserProfile_userId_isBCHDefault_key`(`userId`, `isBCHDefault`),
    PRIMARY KEY (`walletId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Price` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` DECIMAL(36, 8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `networkId` INTEGER NOT NULL,
    `quoteId` INTEGER NOT NULL,

    UNIQUE INDEX `Price_timestamp_quoteId_networkId_key`(`timestamp`, `quoteId`, `networkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricesOnTransactions` (
    `priceId` INTEGER NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`priceId`, `transactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `ticker` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quote_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AddressesOnUserProfiles` (
    `addressId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `addressId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_networkId_fkey` FOREIGN KEY (`networkId`) REFERENCES `Network`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AddressesOnButtons` ADD CONSTRAINT `AddressesOnButtons_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddressesOnButtons` ADD CONSTRAINT `AddressesOnButtons_paybuttonId_fkey` FOREIGN KEY (`paybuttonId`) REFERENCES `Paybutton`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `WalletsOnUserProfile` ADD CONSTRAINT `WalletsOnUserProfile_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletsOnUserProfile` ADD CONSTRAINT `WalletsOnUserProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Price` ADD CONSTRAINT `Price_networkId_fkey` FOREIGN KEY (`networkId`) REFERENCES `Network`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PricesOnTransactions` ADD CONSTRAINT `PricesOnTransactions_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricesOnTransactions` ADD CONSTRAINT `PricesOnTransactions_priceId_fkey` FOREIGN KEY (`priceId`) REFERENCES `Price`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Price` ADD CONSTRAINT `Price_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AddressesOnUserProfiles` ADD CONSTRAINT `AddressesOnUserProfiles_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `Address`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddressesOnUserProfiles` ADD CONSTRAINT `AddressesOnUserProfiles_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddressesOnUserProfiles` ADD CONSTRAINT `AddressesOnUserProfiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
