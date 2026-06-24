-- Add isPayment column
ALTER TABLE `Transaction` ADD COLUMN `isPayment` BOOLEAN NOT NULL DEFAULT FALSE;

-- Populate isPayment for existing data
UPDATE `Transaction` SET `isPayment` = TRUE WHERE `amount` > 0;

-- Add composite index for addressId + isPayment queries
CREATE INDEX `Transaction_addressId_isPayment_idx` ON `Transaction`(`addressId`, `isPayment`);
