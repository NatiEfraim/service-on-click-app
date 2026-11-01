import { describe, expect, it } from 'vitest';
import { matchesSearch, MAX_SEARCH_DIGITS, parseSearch } from './search';

describe('parseSearch', () => {
  it('asks for everybody when the box is empty', () => {
    expect(parseSearch('')).toEqual({ kind: 'all', identifier: '' });
    expect(parseSearch('   ')).toEqual({ kind: 'all', identifier: '' });
  });

  it('reads digits as a number prefix', () => {
    expect(parseSearch('99810')).toEqual({ kind: 'number', identifier: '99810' });
    expect(parseSearch(' 998 107 ')).toEqual({ kind: 'number', identifier: '998107' });
  });

  it('does not send a digit string the server would answer with 422', () => {
    const tooLong = '1'.repeat(MAX_SEARCH_DIGITS + 1);
    const parsed = parseSearch(tooLong);
    expect(parsed.kind).toBe('invalid');
    expect(parsed.message).toContain('9');
    expect(parseSearch('1'.repeat(MAX_SEARCH_DIGITS)).kind).toBe('number');
  });

  it('reads anything else as a name prefix, spaces left out', () => {
    expect(parseSearch('נתנאל רפאל')).toEqual({ kind: 'name', identifier: 'נתנאלרפאל' });
    expect(parseSearch('דניאל')).toEqual({ kind: 'name', identifier: 'דניאל' });
  });

  it('keeps characters that would break the address out of the request', () => {
    expect(parseSearch('a/b?c#d%e').identifier).toBe('abcde');
    expect(parseSearch('/%?')).toEqual({ kind: 'all', identifier: '' });
  });
});

const PEOPLE = [
  { name: 'דניאל יצחק קם', personalNumber: '99815386', personalId: '315552810' },
  { name: 'אופיר גולדברג', personalNumber: '99807387', personalId: null },
  { name: null, personalNumber: null, personalId: '123456789' },
];

describe('matchesSearch', () => {
  const find = (text: string) => PEOPLE.filter((person) => matchesSearch(person, parseSearch(text))).map((person) => person.name ?? person.personalId);

  it('matches everybody for an empty search and nobody for an invalid one', () => {
    expect(find('')).toHaveLength(3);
    expect(find('1'.repeat(12))).toEqual([]);
  });

  it('matches the start of a personal number or of an ID number', () => {
    expect(find('99815')).toEqual(['דניאל יצחק קם']);
    expect(find('3155')).toEqual(['דניאל יצחק קם']);
    expect(find('1234')).toEqual(['123456789']);
    expect(find('815')).toEqual([]);
  });

  it('matches the start of the name, with or without spaces', () => {
    expect(find('דני')).toEqual(['דניאל יצחק קם']);
    expect(find('דניאל יצ')).toEqual(['דניאל יצחק קם']);
    expect(find('יצחק')).toEqual([]);
  });
});
