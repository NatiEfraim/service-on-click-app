import { describe, expect, it } from 'vitest';

import { fieldNameError, fieldTypeName, newOptionsError, optionCodeError, optionNameError, parseOptionLines, retypeChoices } from './fieldRules';

const others = [{ field_display_name: 'שם אירוע' }, { field_display_name: 'Phone' }];

describe('fieldNameError', () => {
  it('accepts a plain Hebrew name', () => {
    expect(fieldNameError('בדיקה - בחירה', others)).toBeNull();
    expect(fieldNameError('כמות (יח׳) / ימים, 2"', others)).toBeNull();
  });

  it('wants 2 to 50 characters', () => {
    expect(fieldNameError('א', others)).toContain('בין 2 ל-50');
    expect(fieldNameError(' א ', others)).toContain('בין 2 ל-50');
    expect(fieldNameError('א'.repeat(51), others)).toContain('בין 2 ל-50');
    expect(fieldNameError('א'.repeat(50), others)).toBeNull();
  });

  it('refuses symbols the server refuses', () => {
    expect(fieldNameError('מחיר <b>', others)).toContain('אותיות, ספרות');
    expect(fieldNameError('שם;שדה', others)).toContain('אותיות, ספרות');
  });

  it('refuses the name of another field, whatever the case and spaces', () => {
    expect(fieldNameError(' שם אירוע ', others)).toBe('כבר קיים שדה בשם זה בטופס');
    expect(fieldNameError('PHONE', others)).toBe('כבר קיים שדה בשם זה בטופס');
  });
});

describe('options', () => {
  it('reads one option per line and drops the empty ones', () => {
    expect(parseOptionLines(' א \r\n\nב\n   \nג ')).toEqual(['א', 'ב', 'ג']);
  });

  it('wants at least one option and none twice', () => {
    expect(newOptionsError([])).toContain('לפחות אפשרות אחת');
    expect(newOptionsError(['כן', 'לא'])).toBeNull();
    expect(newOptionsError(['כן', ' כן '.trim()])).toBe('קיימות אפשרויות כפולות');
    expect(newOptionsError(['abc', 'ABC'])).toBe('קיימות אפשרויות כפולות');
  });

  it('applies the option name rules to every line', () => {
    expect(newOptionsError(['א/ב'])).toContain('אינו תקין');
    expect(newOptionsError(['א'.repeat(51)])).toContain('אינו תקין');
    expect(newOptionsError(Array.from({ length: 101 }, (_, i) => `אפשרות ${i}`))).toContain('עד 100');
  });

  it('checks one option among its siblings', () => {
    expect(optionNameError('חדשה', ['ישנה'])).toBeNull();
    expect(optionNameError('  ', [])).toBe('יש להזין שם לאפשרות');
    expect(optionNameError('ישנה', ['ישנה'])).toBe('כבר קיימת אפשרות בשם זה');
    expect(optionNameError('א/ב', [])).toContain('בלי לוכסן');
    expect(optionNameError('א'.repeat(51), [])).toContain('עד 50');
    expect(optionNameError('מידה 38 (גדול), "אחר"', [])).toBeNull();
  });
});

describe('field types', () => {
  const types = [
    { id: 2, name: 'text', display_name: 'טקסט סגור', has_options: false, can_be_editable: false },
    { id: 3, name: 'date', display_name: 'תאריך', has_options: false, can_be_editable: true },
    { id: 5, name: 'select', display_name: 'רשימת בחירה', has_options: true, can_be_editable: false },
    { id: 8, name: 'radio', display_name: 'כפתור בחירה', has_options: true, can_be_editable: false },
  ];

  it('names a type from the server list, then from the fallback, then by number', () => {
    expect(fieldTypeName(5, types)).toBe('רשימת בחירה');
    expect(fieldTypeName(22, types)).toBe('מספר עם כוכבית');
    expect(fieldTypeName(99, types)).toBe('סוג 99');
  });

  it('offers a choice only other choices, and a plain field only plain types', () => {
    expect(retypeChoices(types, types[2]).map((t) => t.id)).toEqual([5, 8]);
    expect(retypeChoices(types, types[0]).map((t) => t.id)).toEqual([2, 3]);
    expect(retypeChoices(types, undefined)).toHaveLength(4);
  });
});

describe('optionCodeError', () => {
  it('allows letters, digits, underscore and hyphen up to 50, or nothing unless required', () => {
    expect(optionCodeError('top_secret')).toBeNull();
    expect(optionCodeError('level-1')).toBeNull();
    expect(optionCodeError('')).toBeNull();
    expect(optionCodeError('', true)).toBe('יש להגדיר קוד לאפשרות בשדה זה');
    expect(optionCodeError('סודי')).toContain('אותיות באנגלית');
    expect(optionCodeError('a'.repeat(51))).toContain('עד 50');
  });
});
