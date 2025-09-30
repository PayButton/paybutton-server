-- AddForeignKey
ALTER TABLE `Paybutton` ADD CONSTRAINT `Paybutton_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `UserProfile`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
