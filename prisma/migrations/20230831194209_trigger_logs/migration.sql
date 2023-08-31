-- CreateTable
CREATE TABLE `TriggerLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `triggerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isError` BOOLEAN NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TriggerLog` ADD CONSTRAINT `TriggerLog_triggerId_fkey` FOREIGN KEY (`triggerId`) REFERENCES `PaybuttonTrigger`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
