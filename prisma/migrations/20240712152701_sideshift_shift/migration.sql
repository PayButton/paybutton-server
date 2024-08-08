-- CreateTable
CREATE TABLE `SideshiftShift` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `depositCoin` VARCHAR(191) NOT NULL,
    `settleCoin` VARCHAR(191) NOT NULL,
    `depositNetwork` VARCHAR(191) NOT NULL,
    `settleNetwork` VARCHAR(191) NOT NULL,
    `depositAddress` VARCHAR(191) NOT NULL,
    `settleAddress` VARCHAR(191) NOT NULL,
    `depositMin` VARCHAR(191) NOT NULL,
    `depositMax` VARCHAR(191) NOT NULL,
    `averageShiftSeconds` VARCHAR(191) NOT NULL,
    `depositAmount` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `rate` VARCHAR(191) NOT NULL,
    `settleAmount` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
