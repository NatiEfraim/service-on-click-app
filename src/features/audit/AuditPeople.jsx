'use client';

import { useTargetPerson } from './useTargetPerson';
import { PermissionsPeek } from './PermissionsPeek';

/** The opened row's "who": the full name and personal number of whoever acted, and of the person changed. */
export function AuditPeople({ row }) {
  const person = useTargetPerson(row);
  const actor = row.actor_type === 'system' ? 'המערכת' : `${row.actor_name ?? '—'}${row.actor_id ? ` (${row.actor_id})` : ''}`;
  return (
    <>
      <p><b>בוצע על ידי:</b> {actor}</p>
      {person ? (
        <p>
          <b>המשתמש ששונה:</b> {person.name ? `${person.name} (${person.personalNumber})` : person.personalNumber}
          {row.action === 'user.permissions.change' ? <PermissionsPeek person={person} /> : null}
        </p>
      ) : null}
    </>
  );
}
