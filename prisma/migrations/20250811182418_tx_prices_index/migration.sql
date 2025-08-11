-- RedefineIndex
CREATE INDEX `idx_prices_on_transactions_transaction_id` ON `PricesOnTransactions`(`transactionId`);
DROP INDEX `PricesOnTransactions_transactionId_fkey` ON `PricesOnTransactions`;
