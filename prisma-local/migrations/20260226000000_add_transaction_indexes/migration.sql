-- Add composite index for address sync queries and confirmed filter
ALTER TABLE `Transaction`
  ADD INDEX `Transaction_addressId_timestamp_id_idx`(`addressId`, `timestamp`, `id`),
  ADD INDEX `Transaction_confirmed_idx`(`confirmed`);
