-- Drop foreign key constraints
ALTER TABLE `TransactionInput` DROP FOREIGN KEY `TransactionInput_addressId_fkey`;
ALTER TABLE `TransactionOutput` DROP FOREIGN KEY `TransactionOutput_addressId_fkey`;

-- Drop old indexes
ALTER TABLE `TransactionInput` DROP INDEX `TransactionInput_addressId_idx`;
ALTER TABLE `TransactionOutput` DROP INDEX `TransactionOutput_addressId_idx`;

-- Add new address column (nullable temporarily)
ALTER TABLE `TransactionInput` ADD COLUMN `address` VARCHAR(255) NULL;
ALTER TABLE `TransactionOutput` ADD COLUMN `address` VARCHAR(255) NULL;

-- Populate address column from Address table
UPDATE `TransactionInput` ti
INNER JOIN `Address` a ON ti.`addressId` = a.`id`
SET ti.`address` = a.`address`;

UPDATE `TransactionOutput` tout
INNER JOIN `Address` a ON tout.`addressId` = a.`id`
SET tout.`address` = a.`address`;

-- Make address column NOT NULL
ALTER TABLE `TransactionInput` MODIFY COLUMN `address` VARCHAR(255) NOT NULL;
ALTER TABLE `TransactionOutput` MODIFY COLUMN `address` VARCHAR(255) NOT NULL;

-- Delete Address entries that were only used by TransactionInput/TransactionOutput
-- These addresses are no longer needed since we store addresses as strings
DELETE a FROM `Address` a
WHERE (
  -- Address is referenced in TransactionInput or TransactionOutput
  EXISTS (SELECT 1 FROM `TransactionInput` ti WHERE ti.`addressId` = a.`id`)
  OR EXISTS (SELECT 1 FROM `TransactionOutput` tout WHERE tout.`addressId` = a.`id`)
)
AND NOT (
  -- But exclude addresses that are still used elsewhere
  EXISTS (SELECT 1 FROM `Transaction` t WHERE t.`addressId` = a.`id`)
  OR EXISTS (SELECT 1 FROM `AddressesOnUserProfiles` aup WHERE aup.`addressId` = a.`id`)
  OR EXISTS (SELECT 1 FROM `AddressesOnButtons` ab WHERE ab.`addressId` = a.`id`)
  OR EXISTS (SELECT 1 FROM `ClientPayment` cp WHERE cp.`addressString` = a.`address`)
);

-- Drop old addressId column
ALTER TABLE `TransactionInput` DROP COLUMN `addressId`;
ALTER TABLE `TransactionOutput` DROP COLUMN `addressId`;
