/** Search text to `GET /users/{identifier}`: 1-9 digits are a number prefix (longer is a 422), else a name prefix. */

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

/** Characters that would break the `/users/{identifier}` path segment. */
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

/** The server's rule applied to a fully loaded list: number or name prefix. */
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
