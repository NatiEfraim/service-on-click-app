import { describe, expect, it } from 'vitest';
import { cleanCode, CODE_ERROR, isUnnamed, nameError, NAME_CHARS_ERROR, NAME_LENGTH_ERROR, validateDepartment, validateUnit } from './rules';

describe('nameError', () => {
  it('accepts Hebrew, English, digits and the basic signs', () => {
    for (const name of ['בדיקה', 'כנף צפון', 'NASA', 'מחלקה 2', 'אגף א\'-ב', 'לוגיסטיקה / רכש', 'צוות "אלפא"']) {
      expect(nameError(name), name).toBeNull();
    }
  });

  it('wants 2 to 40 characters after trimming', () => {
    expect(nameError('א')).toBe(NAME_LENGTH_ERROR);
    expect(nameError('   ')).toBe(NAME_LENGTH_ERROR);
    expect(nameError('א'.repeat(41))).toBe(NAME_LENGTH_ERROR);
    expect(nameError('א'.repeat(40))).toBeNull();
  });

  it('refuses other signs', () => {
    expect(nameError('מחלקה <b>')).toBe(NAME_CHARS_ERROR);
    expect(nameError('מחלקה;')).toBe(NAME_CHARS_ERROR);
  });
});

describe('cleanCode', () => {
  it('keeps English letters only, upper case, at most three', () => {
    expect(cleanCode('t')).toBe('T');
    expect(cleanCode('a1b-cd')).toBe('ABC');
    expect(cleanCode('בדיקה')).toBe('');
  });
});

const OTHERS = [
  { code: 'H', name: 'H' },
  { code: 'N', name: 'NASA' },
];

describe('validateUnit', () => {
  it('accepts a new letter and name', () => {
    expect(validateUnit({ code: 'T', name: 'בדיקה' }, OTHERS)).toEqual({});
    expect(validateUnit({ code: 'tx', name: 'בדיקה' }, OTHERS)).toEqual({});
  });

  it('wants 1 to 3 English letters', () => {
    expect(validateUnit({ code: '', name: 'בדיקה' }, OTHERS).code).toBe(CODE_ERROR);
    expect(validateUnit({ code: 'ABCD', name: 'בדיקה' }, OTHERS).code).toBe(CODE_ERROR);
    expect(validateUnit({ code: '1', name: 'בדיקה' }, OTHERS).code).toBe(CODE_ERROR);
  });

  it('refuses a letter or a name another unit already has', () => {
    expect(validateUnit({ code: 'n', name: 'בדיקה' }, OTHERS).code).toBe('האות N כבר משויכת ליחידה אחרת');
    expect(validateUnit({ code: 'T', name: ' nasa ' }, OTHERS).name).toBe('כבר קיימת יחידה בשם זה');
  });

  it('reports both problems at once', () => {
    expect(Object.keys(validateUnit({ code: '', name: 'x' }, OTHERS)).sort()).toEqual(['code', 'name']);
  });
});

describe('validateDepartment', () => {
  it('accepts a new name and refuses a repeated one (any case, switched-off ones included)', () => {
    expect(validateDepartment('לוגיסטיקה', ['רכש'])).toBeNull();
    expect(validateDepartment(' רכש ', ['רכש'])).toBe('כבר קיימת ביחידה מחלקה בשם זה');
    expect(validateDepartment('logistics', ['Logistics'])).toBe('כבר קיימת ביחידה מחלקה בשם זה');
  });

  it('uses the name rules', () => {
    expect(validateDepartment('א', [])).toBe(NAME_LENGTH_ERROR);
  });
});

describe('isUnnamed', () => {
  it('is true while the name is still the letter', () => {
    expect(isUnnamed({ code: 'H', name: 'H' })).toBe(true);
    expect(isUnnamed({ code: 'H', name: 'חיל' })).toBe(false);
  });
});
