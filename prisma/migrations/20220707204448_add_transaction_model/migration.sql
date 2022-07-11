-- CreateTable
CREATE TABLE `Transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hash` VARCHAR(255) NOT NULL,
    `amount` VARCHAR(255) NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `paybuttonAddressId` INTEGER NOT NULL,

    UNIQUE INDEX `Transaction_hash_key`(`hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_paybuttonAddressId_fkey` FOREIGN KEY (`paybuttonAddressId`) REFERENCES `PaybuttonAddress`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
