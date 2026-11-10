const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });

/** Compares two sort values: numbers as numbers, text in Hebrew order; empty values always go last. */
export function compareValues(a, b) {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/** asc -> desc -> back to the list's own order. */
export function nextSort(current, id) {
  if (current?.id !== id) return { id, dir: 'asc' };
  return current.dir === 'asc' ? { id, dir: 'desc' } : null;
}

/** A sorted copy; stable, so equal values keep the list's own order. */
export function sortRows(rows, sortValue, dir) {
  const factor = dir === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => compareValues(sortValue(a.row), sortValue(b.row)) * factor || a.index - b.index)
    .map((entry) => entry.row);
}
