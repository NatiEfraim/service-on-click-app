/** Search text to `GET /users/{identifier}`: 1-9 digits are a number prefix (longer is a 422), else a name prefix. */

/** `UserService::MAX_LEN`: the longest digit string the server accepts. */
export const MAX_SEARCH_DIGITS = 9;





/** Characters that would break the `/users/{identifier}` path segment. */
const PATH_CHARS = /[/\\?#%]/g;

export function parseSearch(raw) {
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



const squash = (value) => (value ?? '').replace(/\s+/g, '').toLowerCase();

/** The server's rule applied to a fully loaded list: number or name prefix. */
export function matchesSearch(person, search) {
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
