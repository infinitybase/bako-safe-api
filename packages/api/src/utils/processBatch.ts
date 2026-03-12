/**
 * Process items in batches with concurrency control
 * Prevents overwhelming external services with too many parallel requests
 *
 * @param items Items to process
 * @param batchSize Number of items to process in parallel per batch
 * @param processor Async function to process each item
 * @returns Array of results maintaining order
 *
 * @example
 * ```ts
 * const users = [user1, user2, ..., user20];
 * const results = await processBatch(users, 5, async (user) => {
 *   return await fetchUserData(user.id);
 * });
 * // Processes 5 users at a time, maintains original order
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}
