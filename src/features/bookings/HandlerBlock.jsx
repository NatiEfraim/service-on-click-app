'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError, Loading } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { bookingsApi } from '@/lib/api/endpoints';
import { invalidateWork, keys } from '@/lib/api/keys';
import { fmtDateTime } from '@/lib/format';
import { ROLE_NAME } from '@/lib/labels';
import { routeOf } from '@/lib/routeTypes';
import { useSaveMutation } from '@/lib/useSaveMutation';
import { useSession } from '@/providers/SessionProvider';

/** Picks the handler among the unit's candidates (GET …/handler-candidates: the coordinators and the officers, by name). */
function AssignHandlerDialog({ booking, busy, error, onAssign, onClose }) {
  const candidates = useQuery({
    queryKey: keys.handlerCandidates(booking.uuid),
    queryFn: ({ signal }) => bookingsApi.handlerCandidates(booking.uuid, signal),
    staleTime: 60_000,
  });
  const current = booking.handler?.uuid ?? '';
  const [chosen, setChosen] = useState(current);
  const [problem, setProblem] = useState('');
  const rows = candidates.data ?? [];

  const submit = () => {
    if (!chosen) {
      setProblem('יש לבחור מטפל');
      return;
    }
    if (chosen === current) {
      setProblem('זהו המטפל הנוכחי של הקריאה');
      return;
    }
    setProblem('');
    onAssign(chosen);
  };

  return (
    <FormDialog title={booking.handler ? 'שינוי מטפל' : 'הקצאת מטפל'} onClose={onClose} busy={busy} dirty={chosen !== current} submitLabel="הקצאה" submitDisabled={!rows.length} onSubmit={submit}>
      <p style={{ margin: 0 }}>
        קריאה <span className="serial">{booking.serial_number}</span> ({booking.booking_type_label}): מי מטפל בה?
      </p>
      {candidates.isPending ? (
        <Loading rows={2} />
      ) : candidates.isError ? (
        <FormError>{candidates.error?.message ?? 'לא ניתן לטעון את רשימת המטפלים.'}</FormError>
      ) : rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>אין ביחידה בעלי תפקיד שניתן להקצות לקריאה זו.</p>
      ) : (
        <Field label="מטפל">
          <Select
            value={chosen}
            aria-invalid={problem ? true : undefined}
            onChange={(event) => {
              setChosen(event.target.value);
              setProblem('');
            }}
          >
            <option value="">בחירה…</option>
            {rows.map((person) => (
              <option key={person.uuid} value={person.uuid}>
                {person.full_name}
                {person.roles?.length ? ` · ${person.roles.map((role) => ROLE_NAME[role] ?? role).join(', ')}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <p className="small muted" style={{ margin: 0 }}>ההקצאה אינה משנה את שלב הקריאה; המטפל נשאר גם אם הקריאה תוחזר לשלב קודם.</p>
      <FormError>{problem || error}</FormError>
    </FormDialog>
  );
}

/**
 * The assigned handler (מטפל) of a route-type request (lib/routeTypes) and the ways to change it: "הקצה מטפל" /
 * "שינוי מטפל" (`can_assign_handler`: the route's owner, a dialog with the unit's candidates), "קח לטיפולי" (`can_take`:
 * a coordinator, while nobody is assigned) and "ביטול הקצאה" (an assigner, while the request is at its first step).
 * Every write sends the seen version; 409 / 403 reload the booking (the console's one write-error handling).
 */
export function HandlerBlock({ booking }) {
  const client = useQueryClient();
  const { me, catalog } = useSession();
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const route = routeOf(booking.booking_type_id, catalog);
  const { handler } = booking;
  // the assignment may be cleared only while the request waits at the start of its route
  const canClear = Boolean(booking.can_assign_handler && handler && Number(booking.status_id) === Number(route?.initial_status_id ?? 101));

  const mutation = useSaveMutation({
    mutationFn: (handlerUuid) => bookingsApi.setHandler(booking.uuid ?? booking.serial_number, { handler_uuid: handlerUuid, version: booking.version }),
    success: (result) => result?.message || (result?.data?.handler ? 'המטפל הוקצה' : 'הקצאת המטפל בוטלה'),
    reload: () => invalidateWork(client),
    onSaved: () => setAssigning(false),
    onHandled: () => setAssigning(false),
    // a 422 (not a candidate any more) shows in the dialog when it is open, as a toast otherwise
    onFailed: (shown) => setError(shown.message),
  });
  const assign = (uuid) => {
    setError('');
    mutation.mutate(uuid);
  };

  return (
    <>
      <div className="handler-block">
        <Icon name="user" />
        <span>
          <b>מטפל:</b> {handler ? handler.full_name : <span className="muted">טרם הוקצה</span>}
        </span>
        {handler?.assigned_at ? <span className="small muted">הוקצה {fmtDateTime(handler.assigned_at)}</span> : null}
        {booking.can_take || booking.can_assign_handler || canClear ? (
          <span className="handler-actions">
            {booking.can_take ? (
              <Button size="sm" variant="primary" icon="user" loading={mutation.isPending && mutation.variables === me.user.uuid} onClick={() => assign(me.user.uuid)}>
                קח לטיפולי
              </Button>
            ) : null}
            {booking.can_assign_handler ? (
              <Button size="sm" icon="users" onClick={() => setAssigning(true)}>
                {handler ? 'שינוי מטפל' : 'הקצה מטפל'}
              </Button>
            ) : null}
            {canClear ? (
              <Button size="sm" variant="danger" icon="x" loading={mutation.isPending && mutation.variables === null} onClick={() => assign(null)}>
                ביטול הקצאה
              </Button>
            ) : null}
          </span>
        ) : null}
        {!assigning && error ? <FormError>{error}</FormError> : null}
      </div>
      {assigning ? <AssignHandlerDialog booking={booking} busy={mutation.isPending} error={error} onAssign={assign} onClose={() => setAssigning(false)} /> : null}
    </>
  );
}
