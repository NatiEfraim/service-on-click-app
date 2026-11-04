import { describe, expect, it } from 'vitest';
import { digitsOnly, fieldOfServerError, toNewUserBody, validateNewUser } from './newUser';

const valid = { fullName: 'בדיקה אלפא', personalNumber: '9990001', phone: '' };

describe('validateNewUser', () => {
  it('accepts a Hebrew name, a 7 or 8 digit number and no phone', () => {
    expect(validateNewUser(valid)).toEqual({});
    expect(validateNewUser({ ...valid, personalNumber: '99900012', phone: '0541234567' })).toEqual({});
    expect(validateNewUser({ ...valid, fullName: "בן-ציון ד'" })).toEqual({});
  });

  it('refuses a name that is empty, too long or not Hebrew', () => {
    expect(validateNewUser({ ...valid, fullName: '  ' }).fullName).toContain('שדה חובה');
    expect(validateNewUser({ ...valid, fullName: 'א'.repeat(31) }).fullName).toContain('30');
    expect(validateNewUser({ ...valid, fullName: 'Alpha' }).fullName).toBe('שם מלא יכול להכיל אותיות בעברית בלבד');
    expect(validateNewUser({ ...valid, fullName: 'בדיקה 2' }).fullName).toBe('שם מלא יכול להכיל אותיות בעברית בלבד');
  });

  it('refuses a personal number that is not 7 or 8 digits', () => {
    expect(validateNewUser({ ...valid, personalNumber: '999000' }).personalNumber).toBe('מספר אישי אינו תקין');
    expect(validateNewUser({ ...valid, personalNumber: '999000123' }).personalNumber).toBe('מספר אישי אינו תקין');
    expect(validateNewUser({ ...valid, personalNumber: '99900a1' }).personalNumber).toBe('מספר אישי אינו תקין');
  });

  it('refuses a phone that does not start with 05 and have 10 digits', () => {
    expect(validateNewUser({ ...valid, phone: '0612345678' }).phone).toContain('05');
    expect(validateNewUser({ ...valid, phone: '054123456' }).phone).toContain('05');
  });
});

describe('digitsOnly', () => {
  it('keeps digits and cuts at the limit', () => {
    expect(digitsOnly('99 900-01a2', 8)).toBe('99900012');
    expect(digitsOnly('123456789', 8)).toBe('12345678');
  });
});

describe('toNewUserBody', () => {
  it('trims, turns an empty phone into null and sends the unit only when one was chosen', () => {
    expect(toNewUserBody({ fullName: ' בדיקה אלפא ', personalNumber: ' 9990001 ', phone: '' }, { departmentId: null })).toEqual({
      personal_number: '9990001',
      full_name: 'בדיקה אלפא',
      phone: null,
      department_id: null,
    });
    expect(toNewUserBody({ ...valid, phone: '0541234567' }, { unitId: 1, departmentId: 4 })).toEqual({
      personal_number: '9990001',
      full_name: 'בדיקה אלפא',
      phone: '0541234567',
      unit_id: 1,
      department_id: 4,
    });
  });
});

describe('fieldOfServerError', () => {
  it('maps the API field names to the form fields', () => {
    expect(fieldOfServerError('personal_number')).toBe('personalNumber');
    expect(fieldOfServerError('full_name')).toBe('fullName');
    expect(fieldOfServerError('phone')).toBe('phone');
    expect(fieldOfServerError('unit_id')).toBeNull();
  });
});
