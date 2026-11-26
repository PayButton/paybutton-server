-- Add lastActivityAt column
ALTER TABLE `Address` ADD COLUMN `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Backfill with the newest known activity: its latest tx, its creation, its
-- latest paybutton/wallet link and its latest client payment.
UPDATE `Address` a
SET a.`lastActivityAt` = GREATEST(
  a.`createdAt`,
  COALESCE((SELECT FROM_UNIXTIME(MAX(t.`timestamp`)) FROM `Transaction` t WHERE t.`addressId` = a.`id`), a.`createdAt`),
  COALESCE((SELECT MAX(ab.`updatedAt`) FROM `AddressesOnButtons` ab WHERE ab.`addressId` = a.`id`), a.`createdAt`),
  COALESCE((SELECT MAX(au.`updatedAt`) FROM `AddressesOnUserProfiles` au WHERE au.`addressId` = a.`id`), a.`createdAt`),
  COALESCE((SELECT MAX(cp.`createdAt`) FROM `ClientPayment` cp WHERE cp.`addressString` = a.`address`), a.`createdAt`)
);

-- CreateIndex
CREATE INDEX `Address_networkId_lastActivityAt_idx` ON `Address`(`networkId`, `lastActivityAt`);
