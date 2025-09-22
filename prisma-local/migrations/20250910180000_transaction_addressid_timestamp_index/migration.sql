-- Replace single-column index with composite (addressId, timestamp)
ALTER TABLE `Transaction`
  ADD INDEX `Transaction_addressId_timestamp_idx`(`addressId`, `timestamp`),
  DROP INDEX `Transaction_addressId_fkey`;
