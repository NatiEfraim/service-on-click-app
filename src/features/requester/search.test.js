import { describe, expect, it } from 'vitest';
import { matchesRequesterSearch } from './search';

describe('requester free text search', () => {
  const row = { serial_number: 729947, booking_type: { display_name: 'ציוד גברים' } };
  it('matches a partial call number, category or both', () => {
    expect(matchesRequesterSearch(row, '994')).toBe(true);
    expect(matchesRequesterSearch(row, 'ציוד')).toBe(true);
    expect(matchesRequesterSearch(row, '  גברים   729 ')).toBe(true);
  });
  it('rejects unrelated numbers and categories', () => {
    expect(matchesRequesterSearch(row, 'מספרה')).toBe(false);
    expect(matchesRequesterSearch(row, '729 מספרה')).toBe(false);
  });
  it('handles empty queries and missing category fields', () => {
    expect(matchesRequesterSearch(row, '')).toBe(true);
    expect(matchesRequesterSearch({ serial_number: 123 }, '123')).toBe(true);
    expect(matchesRequesterSearch({}, 'ציוד')).toBe(false);
  });
});
