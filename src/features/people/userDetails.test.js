import { expect, it } from 'vitest';
import { userDetails } from './userDetails';
it('locks imported names and allows a missing phone to use the draft', () => {
  expect(userDetails({ first_name: ' ישראל ', surname: 'ישראלי', phone: null }, { firstName: 'אחר', surname: 'אחר', phone: '0541234567' })).toMatchObject({ firstName: 'ישראל', surname: 'ישראלי', fullName: 'ישראל ישראלי', firstNameLocked: true, surnameLocked: true, phone: '0541234567', phoneLocked: false });
});
it('preserves a compound surname and allows filling a missing first name', () => {
  expect(userDetails({ surname: 'בן ציון' }, { firstName: 'ישראל' })).toMatchObject({ firstNameLocked: false, surnameLocked: true, fullName: 'ישראל בן ציון' });
});
it('locks a returned phone and allows manual entry when no person was found', () => {
  expect(userDetails({ phone: '0541234567' }, { phone: '0500000000' })).toMatchObject({ phone: '0541234567', phoneLocked: true });
  expect(userDetails(null, { firstName: 'ישראל', surname: 'ישראלי' })).toMatchObject({ firstNameLocked: false, surnameLocked: false, fullName: 'ישראל ישראלי' });
});
