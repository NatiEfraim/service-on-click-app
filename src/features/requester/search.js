export function matchesRequesterSearch(row, query) {
  const terms = query.trim().toLocaleLowerCase('he').split(/\s+/).filter(Boolean);
  const text = [row.serial_number, row.booking_type?.display_name].filter((value) => value != null).join(' ').toLocaleLowerCase('he');
  return terms.every((term) => text.includes(term));
}
