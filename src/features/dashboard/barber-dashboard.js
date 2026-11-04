/** Keep the order, labels and set of statuses supplied by the API. */
export function barberStatusTiles(data) {
  return Object.values(data?.dashboard ?? {}).filter((row) => row && typeof row === 'object' && row.status_id != null);
}
