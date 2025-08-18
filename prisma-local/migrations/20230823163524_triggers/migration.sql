-- CreateTable
CREATE TABLE `PaybuttonTrigger` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `paybuttonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sendEmail` BOOLEAN NOT NULL,
    `postData` LONGTEXT NOT NULL,
    `postURL` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaybuttonTrigger` ADD CONSTRAINT `PaybuttonTrigger_paybuttonId_fkey` FOREIGN KEY (`paybuttonId`) REFERENCES `Paybutton`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
