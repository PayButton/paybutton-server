-- AlterTable
ALTER TABLE `UserProfile` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Organization_creatorId_key`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationInvite` (
    `id` VARCHAR(191) NOT NULL DEFAULT (uuid()),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `usedBy` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `OrganizationInvite_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserProfile` ADD CONSTRAINT `UserProfile_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationInvite` ADD CONSTRAINT `OrganizationInvite_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
