'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { usePresence } from '@/components/ui/usePresence';
import { useSession } from '@/providers/SessionProvider';
import { grantsFromPermissionNames, roleLabel } from '@/features/people/permissions';
import { useOutsideClose } from '@/components/ui/useOutsideClose';
import { useWindowMeasure } from '@/components/ui/useWindowMeasure';

/** An icon per role in the permissions peek. */
const ROLE_ICON = { admin: 'shield', admin_ict: 'shield', commander: 'shield', approver: 'check', vice_approver: 'users', transportation_control_officer: 'car', in_unit_food_control_officer: 'cup', infosec_officer: 'shield', ict_handler: 'layers', interview_coordinator: 'calendar', department_security_officer: 'user' };

/** An eye beside the changed person: a quick look at the permissions they hold now, grouped by role. */
export function PermissionsPeek({ person }) {
  const { typeName } = useSession();
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  const ref = useRef(null);
  const popRef = useRef(null);
  // the card renders in <body> (the table's scroll box would clip it) and is placed by the eye: below it, or above it
  // when the window has no room below, and kept inside the window sideways
  const [place, setPlace] = useState(null);

  // measured again (before paint) every time it opens
  useWindowMeasure(presence.mounted, () => {
    const button = ref.current?.getBoundingClientRect();
    const pop = popRef.current;
    if (!button || !pop) return;
    const { offsetHeight: height, offsetWidth: width } = pop;
    const gap = 8;
    const below = window.innerHeight - button.bottom - gap;
    const top = below >= height || below >= button.top - gap ? Math.min(button.bottom + gap, window.innerHeight - height - gap) : Math.max(gap, button.top - gap - height);
    // rtl: the card's right edge on the eye's right edge, inside the window
    const right = Math.min(Math.max(gap, window.innerWidth - button.right), window.innerWidth - width - gap);
    setPlace({ top: Math.max(gap, top), right: Math.max(gap, right) });
  }, [person.loading]);

  useOutsideClose(open, () => setOpen(false), [ref, popRef]);

  const grants = person.permissions ? grantsFromPermissionNames(person.permissions.map((permission) => permission.name)) : [];

  return (
    <span ref={ref} className="audit-peek">
      <button type="button" className="audit-peek-btn" aria-expanded={open} aria-label={`ההרשאות הנוכחיות של ${person.name ?? 'המשתמש'}`} data-tip="הצצה בהרשאות הנוכחיות" onClick={(event) => { event.stopPropagation(); setOpen(!open); }}>
        <Icon name="eye" />
      </button>
      {presence.mounted ? createPortal(
        <span
          ref={popRef}
          className="menu audit-peek-pop"
          role="dialog"
          aria-label="הרשאות נוכחיות"
          data-closing={presence.closing || undefined}
          // hidden for the first frame, until it is measured and placed
          style={place ? { position: 'fixed', top: place.top, right: place.right, left: 'auto' } : { position: 'fixed', top: 0, right: 0, left: 'auto', visibility: 'hidden' }}
        >
          <b>ההרשאות של {person.name ?? 'המשתמש'} כעת</b>
          {person.loading ? (
            <span className="hint">טוען...</span>
          ) : person.failed ? (
            <span className="hint">לא ניתן לטעון את ההרשאות של המשתמש כרגע.</span>
          ) : grants.length === 0 ? (
            <span className="hint">אין הרשאות ניהול.</span>
          ) : (
            grants.map((grant) => (
              <span key={grant.role} className="audit-peek-row">
                <span className="audit-peek-role">
                  <Icon name={ROLE_ICON[grant.role] ?? 'users'} />
                  {roleLabel(grant.role)}
                </span>
                <span className="audit-peek-domains">
                  {grant.bookingTypeIds.map((id) => (
                    <span key={id} className="audit-peek-domain">
                      <DomainBadge bookingTypeId={id} size="sm" />
                      {typeName(id)}
                    </span>
                  ))}
                </span>
              </span>
            ))
          )}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
