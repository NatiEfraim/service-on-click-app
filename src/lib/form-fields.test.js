import { describe, expect, it } from 'vitest';
import { fieldKind, fieldRules, parseValidations, regexFrom, validateValue } from './form-fields';

describe('fieldKind', () => {
  it('draws each server type as the right input', () => {
    expect(fieldKind('text_area')).toEqual({ kind: 'textarea', inputType: 'text', ltr: false });
    expect(fieldKind('tel')).toEqual({ kind: 'text', inputType: 'tel', ltr: true });
    expect(fieldKind('select').kind).toBe('select');
    expect(fieldKind('date').inputType).toBe('date');
    expect(fieldKind('something_new')).toEqual({ kind: 'text', inputType: 'text', ltr: false });
  });
});

describe('parseValidations', () => {
  it('takes the object the API sends now, and nothing from null or an empty PHP array', () => {
    expect(parseValidations({ required: 'יש להזין', 'max:255': 'עד 255' })).toEqual({ required: 'יש להזין', 'max:255': 'עד 255' });
    expect(parseValidations(null)).toEqual({});
    expect(parseValidations([])).toEqual({});
  });

  it('still reads the older JSON string, even encoded twice', () => {
    expect(parseValidations('{"required":"יש להזין"}')).toEqual({ required: 'יש להזין' });
    expect(parseValidations(JSON.stringify(JSON.stringify({ regex: '^\\d{9}$' })))).toEqual({ regex: '^\\d{9}$' });
    expect(parseValidations('not json')).toEqual({});
  });
});

describe('regexFrom', () => {
  it('reads a PHP pattern with its delimiters and flags', () => {
    expect(regexFrom('/^\\d{9}$/').test('300000777')).toBe(true);
    expect(regexFrom('/^\\d{9}$/').test('12345')).toBe(false);
    expect(regexFrom('~^[א-ת ]+$~u').test('שלום עולם')).toBe(true);
    expect(regexFrom('^05[012458]\\d{7}$').test('0521234567')).toBe(true);
    expect(regexFrom('/(unclosed/')).toBeNull();
  });
});

describe('fieldRules and validateValue', () => {
  const personalId = fieldRules({ required: 'יש להזין מספר תעודת זהות', 'regex:/^\\d{9}$/': 'תעודת זהות חייבת להכיל 9 ספרות בדיוק' });
  const name = fieldRules({ required: 'יש להזין שם פרטי', string: 'פורמט אינו תקין', 'max:255': 'ניתן להזין עד 255 תווים' });

  it('uses the field\'s own messages', () => {
    expect(validateValue(personalId, '', { required: true })).toBe('יש להזין מספר תעודת זהות');
    expect(validateValue(personalId, '', { required: false })).toBeNull();
    expect(validateValue(personalId, '12345', { required: true })).toBe('תעודת זהות חייבת להכיל 9 ספרות בדיוק');
    expect(validateValue(personalId, '300000777', { required: true })).toBeNull();
    expect(validateValue(name, 'א'.repeat(256), { required: true })).toBe('ניתן להזין עד 255 תווים');
    expect(validateValue(name, 'משה', { required: true })).toBeNull();
  });

  it('bounds a number by value and a text by length, with fallback messages', () => {
    const size = fieldRules({ numeric: 'יש להזין מספר תקין', 'min:0': 'נפח חייב להיות מספר חיובי' });
    expect(validateValue(size, '-1', { kind: 'number' })).toBe('נפח חייב להיות מספר חיובי');
    expect(validateValue(size, 'abc', { kind: 'number' })).toBe('יש להזין מספר תקין');
    expect(validateValue(size, '12', { kind: 'number' })).toBeNull();
    expect(validateValue(fieldRules({ 'max:3': null }), 'abcd')).toBe('ניתן להזין עד 3 תווים');
    expect(validateValue(fieldRules(null), '', { required: true })).toBe('שדה חובה');
  });

  it('checks the format of a date and a time', () => {
    const date = fieldRules({ required: 'יש לבחור תאריך לתחקיר', date: 'תאריך אינו תקין' });
    const time = fieldRules({ required: 'יש לבחור שעה לתחקיר', 'date_format:H:i': 'שעה אינה תקינה (HH:MM)' });
    expect(validateValue(date, '2026-11-21', { kind: 'date', required: true })).toBeNull();
    expect(validateValue(date, '21/11/2026', { kind: 'date' })).toBe('תאריך אינו תקין');
    expect(validateValue(time, '10:30', { kind: 'time' })).toBeNull();
    expect(validateValue(time, '1030', { kind: 'time' })).toBe('שעה אינה תקינה (HH:MM)');
    expect(validateValue(time, '', { kind: 'time', required: true })).toBe('יש לבחור שעה לתחקיר');
  });

  it('reads the old regex shape too', () => {
    expect(fieldRules('{"regex":"^\\\\d{5,9}$"}').regex.test('70001')).toBe(true);
  });
});
