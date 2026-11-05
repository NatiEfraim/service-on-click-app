'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { peopleApi } from '@/lib/api/endpoints';
import { PERSONAL_NUMBER_PATTERN } from '@/lib/patterns';
import { useDebounced } from '@/lib/useDebounced';

import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import { digitsOnly, fieldOfServerError, FULL_NAME_MAX, PERSONAL_NUMBER_MAX, PHONE_LENGTH, toNewUserBody, validateNewUser } from './newUser';
import { invalidatePeople } from './queries';
import { lookupState } from './vaticanLookup';
import { userDetails } from './userDetails';

/** Adds a person. Only the super admin picks the unit; the server forces everyone else's own unit. */
export function NewUserDialog({ onClose, onCreated }) {
  const client = useQueryClient();
  const toast = useToast();
  const { me, catalog } = useSession();
  const formId = useId();
  const errorId = (field) => `${formId}-${field}-error`;

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [chosenUnit, setChosenUnit] = useState(me.user.unit_id ?? catalog.units[0]?.id ?? 0);
  const [departmentId, setDepartmentId] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const settledNumber = useDebounced(personalNumber, 500);
  const validNumber = PERSONAL_NUMBER_PATTERN.test(personalNumber);
  const settled = validNumber && settledNumber === personalNumber;
  const lookup = useQuery({
    queryKey: ['vatican-new-user', settledNumber],
    queryFn: ({ signal }) => peopleApi.lookupVatican(settledNumber, signal),
    enabled: settled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { person, notFound, ready } = lookupState(personalNumber, settledNumber, lookup);
  const details = userDetails(person, { firstName, surname, phone });
  const lookupError = settled && lookup.isError && !notFound
    ? lookup.error.status === 503 ? 'לא ניתן לגשת ל־Vatican כרגע, נסו שוב בעוד כמה דקות.' : lookup.error.message
    : '';

  const unitId = me.is_super_admin ? chosenUnit : me.user.unit_id;
  const departments = catalog.departments.filter((department) => department.unit_id === unitId && department.is_active !== false);

  const mutation = useMutation({
    mutationFn: (body) => peopleApi.createUser(body),
    onSuccess: async (result) => {
      toast(result.message || 'המשתמש נוצר.', 'ok');
      onCreated(result.data);
      onClose();
      await invalidatePeople(client);
    },
    onError: (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'יצירת המשתמש נכשלה.');
      const fromServer = {};
      for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
        const field = fieldOfServerError(key);
        if (field && messages[0] && !fromServer[field]) fromServer[field] = messages[0];
      }
      setErrors(fromServer);
      // messages tied to no field are shown once for the form
      setFormError(Object.keys(fromServer).length ? '' : apiError.message);
    },
  });

  function submit(event) {
    event.preventDefault();
    if (!ready || lookup.isFetching || mutation.isPending) return;
    const input = { fullName: details.fullName, personalNumber: person?.personal_number ?? personalNumber, phone: details.phone };
    const found = validateNewUser(input);
    if (!details.firstName.trim()) found.firstName = 'יש להזין שם פרטי';
    if (!details.surname.trim()) found.surname = 'יש להזין שם משפחה';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    mutation.mutate(
      toNewUserBody(input, {
        unitId: me.is_super_admin ? chosenUnit : undefined,
        departmentId: departmentId ? Number(departmentId) : null,
      }),
    );
  }

  const a11y = (name) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? errorId(name) : undefined,
  });

  const fieldError = (name) => (
    <div id={errorId(name)} className="err" aria-live="polite">
      {errors[name]}
    </div>
  );

  return (
    <Modal
      title="משתמש חדש"
      onClose={onClose}
      busy={mutation.isPending}
      footer={
        <>
          <Button type="submit" form={formId} variant="primary" disabled={!ready || lookup.isFetching} loading={mutation.isPending}>
            יצירה
          </Button>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div>
          <Field label="מספר אישי">
            <input className="input" value={personalNumber} inputMode="numeric" dir="rtl"
              maxLength={PERSONAL_NUMBER_MAX} autoComplete="off" required placeholder="7 או 8 ספרות"
              disabled={mutation.isPending} aria-describedby={formId + '-lookup-status'}
              onChange={(event) => {
                setPersonalNumber(digitsOnly(event.target.value, PERSONAL_NUMBER_MAX));
                setFirstName(''); setSurname(''); setPhone(''); setDepartmentId('');
                setChosenUnit(me.user.unit_id ?? catalog.units[0]?.id ?? 0);
                setErrors({}); setFormError('');
              }} {...a11y('personalNumber')} />
          </Field>
          {fieldError('personalNumber')}
        </div>
        <div id={formId + '-lookup-status'} aria-live="polite">
          {!validNumber ? <p className="ppl-summary">יש להזין מספר אישי כדי לבדוק את הפרטים ב־Vatican.</p>
            : !settled || lookup.isFetching ? <p className="ppl-summary">מחפש ב־Vatican…</p>
              : person ? <p className="ppl-summary">המשתמש נמצא ב־Vatican. הפרטים שהתקבלו נעולים לעריכה; אפשר להשלים פרטים חסרים.</p>
                : notFound ? <p className="ppl-summary">המספר האישי לא נמצא ב־Vatican. אפשר להזין את הפרטים ידנית.</p> : null}
          <FormError>{lookupError}</FormError>
          {lookupError ? <Button size="sm" onClick={() => void lookup.refetch()}>ניסיון נוסף</Button> : null}
        </div>
        {person?.personal_id ? (
          <Field label="תעודת זהות">
            <input className="input" value={person.personal_id} readOnly dir="ltr" />
          </Field>
        ) : null}
        <fieldset disabled={!ready || lookup.isFetching || mutation.isPending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 14 }}>

        <div className="cols2">
          <div>
            <Field label="שם פרטי">
              <input className="input" value={details.firstName} disabled={details.firstNameLocked}
                maxLength={FULL_NAME_MAX} autoComplete="off" required
                onChange={(event) => setFirstName(event.target.value)} {...a11y('firstName')} />
            </Field>
            {fieldError('firstName')}
          </div>
          <div>
            <Field label="שם משפחה">
              <input className="input" value={details.surname} disabled={details.surnameLocked}
                maxLength={FULL_NAME_MAX} autoComplete="off" required
                onChange={(event) => setSurname(event.target.value)} {...a11y('surname')} />
            </Field>
            {fieldError('surname')}
          </div>
        </div>
        {fieldError('fullName')}

        <div className="cols2">
          <div>
            <Field label="טלפון נייד (רשות)">
              <input
                className="input"
                type="tel"
                value={details.phone}
                readOnly={details.phoneLocked}
                inputMode="numeric"
                maxLength={PHONE_LENGTH}
                autoComplete="off"
                onChange={(event) => setPhone(digitsOnly(event.target.value, PHONE_LENGTH))}
                {...a11y('phone')}
              />
            </Field>
            {fieldError('phone')}
          </div>
        </div>

        <div className="cols2">
          {me.is_super_admin ? (
            <Field label="יחידה">
              <Select
                className="input"
                value={chosenUnit}
                onChange={(event) => {
                  setChosenUnit(Number(event.target.value));
                  setDepartmentId('');
                }}
              >
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="מחלקה (רשות)">
            <Select className="input" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">ללא מחלקה</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        </fieldset>
        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
