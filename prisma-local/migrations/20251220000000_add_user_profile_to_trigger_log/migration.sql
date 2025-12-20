-- AlterTable
ALTER TABLE `TriggerLog` ADD COLUMN `userId` VARCHAR(255) NULL;

-- AddForeignKey
ALTER TABLE `TriggerLog` ADD CONSTRAINT `TriggerLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
