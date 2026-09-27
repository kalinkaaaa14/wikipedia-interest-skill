/** Run async tasks with limited concurrency (Wikimedia asks clients to be gentle). */
export async function mapLimit<Item, Result>(items: Item[], limit: number, mapItem: (item: Item) => Promise<Result>): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapItem(items[index]);
    }
  });
  await Promise.all(workers);

  return results;
}
