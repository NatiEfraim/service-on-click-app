import { describe, expect, it } from 'vitest';
import { actionTone, actionVariant, commentError, COMMENT_MAX, domainIconSrc, statusTone } from './labels';

describe('commentError (the rule the server enforces on a decision)', () => {
  it('accepts Hebrew letters and spaces', () => {
    expect(commentError('חסר מידע בבקשה', true)).toBeNull();
  });

  it('requires a comment when the action says so, and allows none otherwise', () => {
    expect(commentError('   ', true)).toBe('יש לצרף הערה לביצוע פעולה זו');
    expect(commentError('', false)).toBeNull();
  });

  it('rejects digits, punctuation and Latin letters', () => {
    const message = 'ההערה יכולה להכיל אותיות בעברית ורווחים בלבד';
    expect(commentError('בקשה 2', false)).toBe(message);
    expect(commentError('לא, תודה', false)).toBe(message);
    expect(commentError('abc', false)).toBe(message);
  });

  it(`rejects more than ${COMMENT_MAX} characters`, () => {
    expect(commentError('א'.repeat(COMMENT_MAX), false)).toBeNull();
    expect(commentError('א'.repeat(COMMENT_MAX + 1), false)).toContain(String(COMMENT_MAX));
  });
});

describe('statusTone', () => {
  it('colours the shared status numbers', () => {
    expect(statusTone(5)).toBe('ok');
    expect(statusTone(4)).toBe('bad');
    expect(statusTone(7)).toBe('bad');
    expect(statusTone(8)).toBe('hold');
    expect(statusTone(3)).toBe('acc');
    expect(statusTone(15)).toBe('acc');
    expect(statusTone(1)).toBe('warn');
  });
});

describe('actionTone', () => {
  it('draws rejections and cancellations as destructive, supplier waits as a hold, the rest as the main action', () => {
    expect(actionTone({ status_id: 4 })).toBe('danger');
    expect(actionTone({ status_id: 16 })).toBe('danger');
    expect(actionTone({ status_id: 9 })).toBe('hold');
    expect(actionTone({ status_id: 15 })).toBe('primary');
    expect(actionTone({ status_id: 3 })).toBe('primary');
  });
});

describe('domainIconSrc', () => {
  it('points at the bundled icon of a known domain and at nothing for an unknown one', () => {
    expect(domainIconSrc(13)).toBe('/icons/domains/13.svg');
    expect(domainIconSrc(14)).toBe('/icons/requester/clearance-grant.svg');
    // the service desk's types have no picture file: TypePicture draws theirs (TypeIcon)
    expect(domainIconSrc(20, 'software_install')).toBeNull();
    expect(domainIconSrc(99)).toBeNull();
  });
});

describe('the service desk\'s route (תקשוב: 1 sent, 151 in handling, 5 / 7 closed)', () => {
  it('colours a request in a representative\'s hands as progress', () => {
    expect(statusTone(151)).toBe('acc');
    expect(statusTone(1)).toBe('warn');
  });

  it('draws its moves by their direction: taking it forward, closing it, closing without doing as destructive, back to the queue as a plain button', () => {
    expect(actionTone({ status_id: 151, direction: 'forward' })).toBe('primary');
    expect(actionTone({ status_id: 5, direction: 'close' })).toBe('primary');
    expect(actionTone({ status_id: 7, direction: 'reject' })).toBe('danger');
    expect(actionTone({ status_id: 1, direction: 'back' })).toBe('secondary');
    expect(actionVariant({ status_id: 151, direction: 'back' })).toBe('default');
  });
});

describe('the clearance grant\'s route (statuses 101-105, actions with a direction)', () => {
  it('colours its statuses: granted is good, the steps in between are progress', () => {
    expect(statusTone(105)).toBe('ok');
    expect(statusTone(101)).toBe('warn');
    expect(statusTone(103)).toBe('acc');
  });

  it('reads an action\'s direction: a refusal is destructive, a move back a plain button, a step forward the main action', () => {
    expect(actionTone({ status_id: 4, direction: 'reject' })).toBe('danger');
    expect(actionTone({ status_id: 101, direction: 'back' })).toBe('secondary');
    expect(actionTone({ status_id: 102, direction: 'forward' })).toBe('primary');
    expect(actionTone({ status_id: 105, direction: 'close' })).toBe('primary');
    expect(actionVariant({ status_id: 101, direction: 'back' })).toBe('default');
    expect(actionVariant({ status_id: 4, direction: 'reject' })).toBe('danger');
    expect(actionVariant({ status_id: 9 })).toBe('hold');
  });
});
