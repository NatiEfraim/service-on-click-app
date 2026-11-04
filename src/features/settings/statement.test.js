import { describe, expect, it } from 'vitest';
import { forbiddenChars, NO_STATEMENT, statementError, statementFromServer } from './statement';

describe('statementFromServer', () => {
  it('shows the placeholder the server stores for "no statement" as an empty box', () => {
    expect(statementFromServer(NO_STATEMENT)).toBe('');
    expect(statementFromServer(null)).toBe('');
    expect(statementFromServer('לידיעתך')).toBe('לידיעתך');
  });
});

describe('statementError', () => {
  it('accepts the statements that exist today', () => {
    const real = 'לתשומת ליבך, בעת בחירת "מטרת נסיעה":\n1. משימה - תאריך הסיום חייב להיות זהה (נסיעה של יום אחד).\nלידיעתך {30} דקות';
    expect(statementError(real, true)).toBeNull();
  });

  it('refuses an underscore, like the server (its pattern has no "_")', () => {
    expect(statementError('לידיעתך {haircut_time} דקות', true)).toContain('_');
  });

  it('needs a text when the statement is on', () => {
    expect(statementError('  ', true)).toBe('להצהרה פעילה חייב להיות נוסח.');
    expect(statementError('', false)).toBeNull();
  });

  it('names the characters the server refuses', () => {
    expect(forbiddenChars('מה? כן; לא')).toEqual(['?', ';']);
    expect(statementError('מה?', false)).toContain('?');
  });
});
