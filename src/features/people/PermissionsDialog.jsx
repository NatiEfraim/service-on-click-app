'use client';

import { SHOW_DEPARTMENTS } from '@/lib/labels';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, ErrorNotice, FormError, Loading, Notice } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { FormDialog } from '@/components/ui/FormDialog';
import { ApiError } from '@/lib/api/client';
import { peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/UiProvider';
import {
  adminAssignments,
  approverAssignments,
  buildMatrix,
  callerFrom,
  cellKey,
  controlOfficerTypesOf,
  pendingChanges,
  reasonError,
  REASON_MAX,
} from './permissions';
import { invalidatePeople, usePerson } from './queries';
import { PermissionsCards } from './PermissionsPicker';
import { SAVED_PART_LABEL } from './constants';
import { Reveal } from '@/components/ui/Reveal';





/** A save is up to three calls in a row; this says which one failed and what was already saved before it. */
class SaveFailure extends Error {
  constructor(
    apiError,
    saved,
  ) {
    super(apiError.message);
    this.apiError = apiError;
    this.saved = saved;
  }
}

function successMessage(saved) {
  const roles = saved.includes('roles') || saved.includes('admin');
  if (roles && saved.includes('department')) return 'הפרטים עודכנו. שינוי ההרשאות נרשם בהיסטוריית השינויים.';
  if (roles) return 'ההרשאות עודכנו ונרשמו בהיסטוריית השינויים.';
  return 'שיוך המחלקה עודכן.';
}

/** Department and permissions matrix of one person; saving sends only changed booking types, with a required reason. */
export function PermissionsDialog({ target, onClose }) {
  const client = useQueryClient();
  const toast = useToast();
  const { me, catalog, typeName, unitName } = useSession();
  const caller = useMemo(() => callerFrom(me), [me]);
  const ids = useId();

  // read fresh on open, dropped on close
  const person = usePerson(target);
  const approver = useQuery({
    queryKey: keys.permissions('approver', target.uuid),
    queryFn: ({ signal }) => peopleApi.approverPermissions(target.uuid, signal),
    staleTime: 0,
    gcTime: 0,
  });
  const admin = useQuery({
    queryKey: keys.permissions('admin', target.uuid),
    queryFn: ({ signal }) => peopleApi.adminPermissions(target.uuid, signal),
    enabled: me.is_super_admin,
    staleTime: 0,
    gcTime: 0,
  });

  const [edits, setEdits] = useState({});
  /** Sets a domain to one role (or none): that role on, every other open role of the domain off (one role per domain). */
  const setRole = (row, role) => {
    setEdits((current) => {
      const updated = { ...current };
      for (const [other, cell] of Object.entries(row.cells)) {
        if (cell.lock === null) updated[cellKey(other, row.bookingTypeId)] = other === role;
      }
      return updated;
    });
    setFormError('');
  };
  const [departmentEdit, setDepartmentEdit] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonProblem, setReasonProblem] = useState('');
  const [formError, setFormError] = useState('');
  const [alreadySaved, setAlreadySaved] = useState('');

  const personData = person.data ?? null;
  const loadError = person.error ?? approver.error ?? admin.error;
  const loading = !loadError && (person.isPending || approver.isPending || (me.is_super_admin && admin.isPending));

  const matrix = useMemo(() => {
    if (!personData || !approver.data || (me.is_super_admin && !admin.data)) return null;
    return buildMatrix({
      approver: approver.data,
      admin: admin.data,
      permissionNames: personData.permissions.map((permission) => permission.name),
      caller,
      targetUuid: target.uuid,
      controlOfficerTypes: controlOfficerTypesOf(catalog),
    });
  }, [personData, approver.data, admin.data, me.is_super_admin, caller, target.uuid, catalog]);

  const changes = matrix ? pendingChanges(matrix, edits) : [];
  const changed = new Set(changes.map((change) => cellKey(change.role, change.bookingTypeId)));

  const currentDepartment = personData?.department_id ?? null;
  const chosenDepartment = departmentEdit === null ? currentDepartment : departmentEdit === '' ? null : Number(departmentEdit);
  const departmentChanged = departmentEdit !== null && chosenDepartment !== currentDepartment;
  const changeCount = changes.length + (departmentChanged ? 1 : 0);

  // active departments of the unit; the current one stays selectable even if disabled
  const departments = personData ? catalog.departments.filter((department) => department.unit_id === personData.unit_id && department.is_active !== false) : [];
  const inactiveCurrent =
    personData && personData.department_id !== null && !departments.some((department) => department.id === personData.department_id)
      ? { id: personData.department_id, name: personData.department_name ?? 'מחלקה' }
      : null;

  async function reload() {
    await Promise.all([person.refetch(), approver.refetch(), me.is_super_admin ? admin.refetch() : Promise.resolve()]);
  }

  const mutation = useMutation({
    mutationFn: async (plan) => {
      const saved = [];
      try {
        if (plan.department !== undefined) {
          await peopleApi.setDepartment(target.uuid, plan.department);
          saved.push('department');
        }
        if (plan.approver.length) {
          await peopleApi.assignApprover({ uuid: target.uuid, reason: plan.reason, role_assignments: plan.approver });
          saved.push('roles');
        }
        if (plan.admin.length) {
          await peopleApi.assignAdmin({ uuid: target.uuid, reason: plan.reason, role_assignments: plan.admin });
          saved.push('admin');
        }
      } catch (e) {
        throw new SaveFailure(e instanceof ApiError ? e : new ApiError(0, 'השמירה נכשלה.'), saved);
      }
      return saved;
    },
    onSuccess: async (saved) => {
      toast(successMessage(saved), 'ok');
      onClose();
      // a person's own permissions decide their own menu
      const own = target.uuid === me.user.uuid ? client.invalidateQueries({ queryKey: keys.me }) : Promise.resolve();
      await Promise.all([invalidatePeople(client), own]);
    },
    onError: async (e) => {
      const failure = e instanceof SaveFailure ? e : new SaveFailure(new ApiError(0, 'השמירה נכשלה.'), []);
      const { apiError, saved } = failure;

      if (saved.length) {
        // partial success: refresh the lists and this dialog
        setAlreadySaved(`כבר נשמרו: ${saved.map((part) => SAVED_PART_LABEL[part]).join(', ')}.`);
        const own = target.uuid === me.user.uuid ? client.invalidateQueries({ queryKey: keys.me }) : Promise.resolve();
        await Promise.all([invalidatePeople(client), own, reload()]);
      }

      if (apiError.stale) {
        // changed by someone else: show the current state, keep the user's ticks
        toast(apiError.message, 'bad');
        await reload();
        return;
      }
      setFormError(apiError.message);
    },
  });

  function submit() {
    if (!matrix) return;
    setFormError('');
    setAlreadySaved('');
    const permissionsChange = changes.length > 0;
    const problem = reasonError(reason, permissionsChange);
    setReasonProblem(problem ?? '');
    if (!permissionsChange && !departmentChanged) {
      setFormError('לא בוצע שינוי.');
      return;
    }
    if (problem) return;
    mutation.mutate({
      department: departmentChanged ? chosenDepartment : undefined,
      approver: approverAssignments(matrix, edits),
      admin: adminAssignments(matrix, edits),
      reason: reason.trim() || null,
    });
  }

  const displayName = target.name ?? personData?.name ?? 'משתמש ללא שם';
  const unitLabel = personData ? (personData.unit_name ?? unitName(personData.unit_id)) : '';
  const ownRowClosed = !me.is_super_admin && target.uuid === me.user.uuid;
  const busy = mutation.isPending;
  const reasonErrorId = `${ids}-reason-error`;

  // The domains table's box gets the room the window has left: the window's cap (88% of the screen) minus all its other
  // parts. Those do not depend on the box's own height, so setting it never changes the sum again (no loop), and the
  // window itself never needs to scroll. Measured again when the window size changes or a part above / below grows.
  const matrixWrap = useRef(null);
  useLayoutEffect(() => {
    const wrap = matrixWrap.current;
    const modal = wrap?.closest('.modal');
    if (!wrap || !modal) return undefined;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // the parts' own heights (not the window's, which SmoothSize may be gliding at that moment): title, body
        // (its natural height, inside SmoothSize) without the table's box, and the buttons
        const part = (selector) => modal.querySelector(selector)?.offsetHeight ?? 0;
        const others = part(':scope > header') + part('.mb') - wrap.offsetHeight + part(':scope > footer');
        const room = Math.floor(window.innerHeight * 0.88 - others);
        const next = `${Math.max(160, room)}px`;
        if (wrap.style.maxHeight !== next) wrap.style.maxHeight = next;
      });
    };
    fit();
    window.addEventListener('resize', fit);
    // a part other than the table changing height (the change summary, an error line) refits; the table does not count
    const observer = new ResizeObserver(fit);
    for (const part of modal.querySelectorAll(':scope > header, :scope > footer, .ppl-head, .ppl-summary, .ppl-reason-reveal')) observer.observe(part);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      observer.disconnect();
    };
  }, [Boolean(matrix)]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FormDialog
      dirty={changes.length > 0 || (departmentEdit !== null && departmentEdit !== (currentDepartment === null ? '' : String(currentDepartment))) || reason.trim() !== ''}
      title={`הרשאות: ${displayName}`}
      wide
      onClose={onClose}
      busy={busy}
      submitDisabled={!matrix}
      onSubmit={submit}
    >
      {loadError ? (
        <ErrorNotice error={loadError} onRetry={() => void reload()} title="לא ניתן לטעון את ההרשאות." />
      ) : loading ? (
        <Loading rows={5} />
      ) : !personData ? (
        <Notice tone="bad">לא ניתן למצוא את פרטי המשתמש. ייתכן שהוא הוסר או שאינו שייך ליחידה שלך.</Notice>
      ) : matrix ? (
        <>
          <div className="ppl-head">
            <div className="who">
              <b>{unitLabel}</b>
              <span>
                {personData.personal_number ? (
                  <>
                    מספר אישי <bdi>{personData.personal_number}</bdi>
                  </>
                ) : null}
                {personData.personal_number && personData.personal_id ? ' · ' : null}
                {personData.personal_id ? (
                  <>
                    ת״ז <bdi>{personData.personal_id}</bdi>
                  </>
                ) : null}
              </span>
            </div>
            {SHOW_DEPARTMENTS ? (
            <Field label="מחלקה">
              <Select
                className="input"
                value={departmentEdit ?? (currentDepartment === null ? '' : String(currentDepartment))}
                disabled={busy}
                onChange={(event) => setDepartmentEdit(event.target.value)}
              >
                <option value="">ללא מחלקה</option>
                {inactiveCurrent ? (
                  <option value={inactiveCurrent.id}>{inactiveCurrent.name} (מושבתת)</option>
                ) : null}
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
            ) : null}
          </div>

          {ownRowClosed ? <Notice tone="warn">לא ניתן לשנות את ההרשאות של עצמך.</Notice> : null}

          {matrix.rows.length ? (
            <div ref={matrixWrap} className="ppl-matrix-wrap pp-wrap">
              <PermissionsCards matrix={matrix} edits={edits} busy={busy} changed={changed} onSetRole={setRole} typeName={typeName} />
            </div>
          ) : (
            <EmptyState title="אין תחומים לשיבוץ">אין תחומים שניתן לשבץ בהם את המשתמש הזה.</EmptyState>
          )}

          <p className={`ppl-summary${changeCount ? ' has' : ''}`} role="status">
            {changeCount ? `${changeCount} שינויים ממתינים לשמירה.` : 'לא סומנו שינויים.'}
          </p>

          {/* shown only once a permission was changed; stays mounted (keeps the typed text) and fades / folds away when
              the changes are undone. Stays in view above the buttons while the table scrolls. */}
          <Reveal open={changes.length > 0} className="ppl-reason-reveal" innerClassName="ppl-reason">
            <Field label="סיבת שינוי ההרשאות (חובה כשמשנים הרשאות)">
            <input
              className="input"
              value={reason}
              maxLength={REASON_MAX}
              placeholder="לדוגמה: מינוי לגורם מטפל בתחום המזון"
              aria-required="true"
              aria-invalid={reasonProblem ? true : undefined}
              aria-describedby={reasonProblem ? reasonErrorId : undefined}
              disabled={busy}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonProblem) setReasonProblem('');
              }}
            />
            </Field>
            <div id={reasonErrorId} className="err" aria-live="polite">
            {reasonProblem}
            </div>
          </Reveal>

          {alreadySaved ? <Notice tone="warn">{alreadySaved}</Notice> : null}
          <FormError>{formError}</FormError>
        </>
      ) : null}
    </FormDialog>
  );
}
