import { Transaction } from '@src/models';

/**
 * Extract all predicate addresses involved in a transaction from its summary
 * @param transaction - The transaction object
 * @returns Array of unique predicate addresses
 */
export const extractPredicatesFromTransaction = (
  transaction: Transaction,
): string[] => {
  const addresses = new Set<string>();

  // Add the main predicate address
  if (transaction.predicate?.predicateAddress) {
    addresses.add(transaction.predicate.predicateAddress);
  }

  // Extract addresses from operations in summary
  if (
    transaction.summary?.operations &&
    Array.isArray(transaction.summary.operations)
  ) {
    for (const operation of transaction.summary.operations) {
      if (operation.to?.address) {
        addresses.add(operation.to.address);
      }
    }
  }

  return Array.from(addresses);
};
