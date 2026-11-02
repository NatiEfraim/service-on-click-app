import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, cleanParams, toApiError } from './client';

function failure(status, data) {
  const config = { url: '/x', headers: {} };
  const response = { status, data, statusText: '', headers: {}, config };
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', config, undefined, response);
}

describe('toApiError', () => {
  it('shows the server Hebrew message as is', () => {
    const error = toApiError(failure(422, { message: 'לא ניתן לשנות סוג של שדה שיש לו ערכים.' }));
    expect(error.message).toBe('לא ניתן לשנות סוג של שדה שיש לו ערכים.');
    expect(error.invalid).toBe(true);
  });

  it('keeps the plain-text 429 answer (it is not JSON)', () => {
    const error = toApiError(failure(429, 'בקשות מרובות לשרת. נא לנסות שוב מאוחר יותר'));
    expect(error.status).toBe(429);
    expect(error.message).toBe('בקשות מרובות לשרת. נא לנסות שוב מאוחר יותר');
  });

  it('flags the three refusals that share one vague text', () => {
    for (const status of [403, 404, 405]) {
      const error = toApiError(failure(status, { message: 'הבקשה לא ניתנת לביצוע.' }));
      expect(error.denied).toBe(true);
      expect(error.message).toBe('הבקשה לא ניתנת לביצוע.');
    }
    expect(toApiError(failure(409, { message: 'הקריאה השתנתה בינתיים.' })).denied).toBe(false);
  });

  it('flags a stale version (409) and an unauthenticated call (401)', () => {
    expect(toApiError(failure(409, { message: 'הקריאה השתנתה בינתיים.' })).stale).toBe(true);
    expect(toApiError(failure(401, { message: 'הגישה נדחתה. יש להתחבר למערכת.' })).unauthenticated).toBe(true);
  });

  it('never shows a technical English message: a debug 500 becomes a generic Hebrew one', () => {
    const error = toApiError(failure(500, { message: 'SQLSTATE[HY000]: General error', exception: 'PDOException' }));
    expect(error.message).toBe('אירעה שגיאה בשרת. נסו שוב מאוחר יותר.');
  });

  it('prefers the first Hebrew field error over an English validation summary', () => {
    const error = toApiError(failure(422, { message: 'The given data was invalid.', errors: { full_name: ['שם מלא יכול להכיל אותיות בעברית בלבד'] } }));
    expect(error.message).toBe('שם מלא יכול להכיל אותיות בעברית בלבד');
    expect(error.fieldErrors.full_name).toEqual(['שם מלא יכול להכיל אותיות בעברית בלבד']);
  });

  it('treats no answer at all as offline', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error.offline).toBe(true);
    expect(error.status).toBe(0);
    expect(error.message).toContain('אין תקשורת');
  });

  it('passes an ApiError through unchanged', () => {
    const original = new ApiError(409, 'x');
    expect(toApiError(original)).toBe(original);
  });
});

describe('cleanParams', () => {
  it('drops empty values and turns lists into comma separated strings and true into 1', () => {
    expect(cleanParams({ q: '', page: 2, types: [1, 3], stage: undefined, mine: true, open_only: false, handler: null, ids: [] })).toEqual({ page: 2, types: '1,3', mine: 1 });
  });

  it('returns undefined when there are no params', () => {
    expect(cleanParams(undefined)).toBeUndefined();
  });
});
