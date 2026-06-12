export function getNextVisibleCount({
  current,
  pageSize,
  total,
}: {
  current: number;
  pageSize: number;
  total: number;
}) {
  return Math.min(current + pageSize, total);
}

export function hasMorePaginatedItems({
  loadedCount,
  total,
  page,
  totalPages,
}: {
  loadedCount: number;
  total: number;
  page: number;
  totalPages: number;
}) {
  if (total > 0) return loadedCount < total;
  if (totalPages > 0) return page < totalPages;
  return false;
}
