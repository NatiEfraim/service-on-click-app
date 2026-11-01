/**
 * The search box of the users screen. The server (`GET /users/{identifier}`) reads a string of digits as the start of a personal number
 * or ID number (1 to 9 digits - anything longer is a 422), anything else as the start of a full name with the spaces left out.
 * This module turns what the user typed into that identifier, and filters a list that is already in memory the same way.
 */

/** `UserService::MAX_LEN`: the longest digit string the server accepts. */
export const MAX_SEARCH_DIGITS = 9;

export type SearchKind = 'all' | 'number' | 'name' | 'invalid';

export interface ParsedSearch {
  kind: SearchKind;
  /** What to ask the server for (no spaces); empty for "everybody". */
  identifier: string;
  /** Why the text cannot be searched (only for `invalid`). */
  message?: string;
}

/** Characters that would end or reshape the `/users/{identifier}` path segment. They never occur in a name or a number. */
const PATH_CHARS = /[/\\?#%]/g;

export function parseSearch(raw: string): ParsedSearch {
  const identifier = raw.replace(/\s+/g, '').replace(PATH_CHARS, '');
  if (!identifier) return { kind: 'all', identifier: '' };

  if (/^\d+$/.test(identifier)) {
    if (identifier.length > MAX_SEARCH_DIGITS) {
      return { kind: 'invalid', identifier, message: `מספר אישי או מספר זהות כולל עד ${MAX_SEARCH_DIGITS} ספרות.` };
    }
    return { kind: 'number', identifier };
  }
  return { kind: 'name', identifier };
}

interface Searchable {
  name: string | null;
  personalNumber: string | null;
  personalId: string | null;
}

const squash = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, '').toLowerCase();

/** The same rule the server applies, for a list that was loaded whole: a number starts with the digits, a name starts with the letters. */
export function matchesSearch(person: Searchable, search: ParsedSearch): boolean {
  switch (search.kind) {
    case 'all':
      return true;
    case 'invalid':
      return false;
    case 'number':
      return (person.personalNumber ?? '').startsWith(search.identifier) || (person.personalId ?? '').startsWith(search.identifier);
    case 'name':
      return squash(person.name).startsWith(search.identifier.toLowerCase());
  }
}
