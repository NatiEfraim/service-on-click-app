'use client';

import { useState } from 'react';
import { CategoryGroup, groupBySection } from '@/components/booking/CategoryGroup';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { usePresence } from '@/components/ui/usePresence';

/** How long "שינויים ממתינים" takes to fade out (matches .pp-group-pending[data-closing] in people.css). */
const PENDING_EXIT_MS = 150;

/** "שינויים ממתינים": fades in when a change waits in the category, and fades out (instead of vanishing) when none does. */
function PendingTag({ show }) {
  const presence = usePresence(show, PENDING_EXIT_MS);
  if (!presence.mounted) return null;
  return <span className="pp-group-pending" data-closing={presence.closing || undefined}>שינויים ממתינים</span>;
}
import { domainColor } from '@/lib/labels';
import { cellKey, roleLabel, shownValue } from './permissions';

/**
 * The permissions grid as domain cards, inside three main categories that open and close: מפקדת מחנה, ביטחון מידע,
 * תקשוב. A person holds at most one role per domain, so each card is a choice among the roles that domain actually has
 * (no column per role, no "—" for the roles it does not have). Built on the same matrix, edits and locks as before.
 */

/** The role a domain is set to now (with the edits), or null. */
function currentRole(row, edits) {
  return Object.keys(row.cells).find((role) => shownValue(row, role, edits)) ?? null;
}

/** The roles of a domain, in the matrix's column order. */
const rolesOf = (row, order) => order.filter((role) => row.cells[role]);

/** A domain's lock (the same for all its roles: the caller's own row, or a domain they do not manage). */
const lockOf = (row) => Object.values(row.cells).find((cell) => cell.lock)?.lock ?? null;

/** Whether this domain's choice differs from what is saved. */
const isChanged = (row, changed) => Object.keys(row.cells).some((role) => changed.has(cellKey(role, row.bookingTypeId)));

/** One domain: its icon and name, its role as a badge, and a button for each of its roles (again to remove). */
function DomainCard({ index = 0, row, roles, edits, busy, changed, onSetRole, typeName }) {
  const lock = lockOf(row);
  const now = currentRole(row, edits);
  return (
    <article
      className={`pp-card${now ? ' set' : ''}${isChanged(row, changed) ? ' changed' : ''}${lock ? ' locked' : ''}`}
      style={{ '--dc': domainColor(row.bookingTypeId), '--i': index }}
      data-tip={lock ?? undefined}
    >
      <header>
        {/* the site's domain tile (as in the requests list): the picture at a size where its outline stays sharp */}
        <DomainBadge bookingTypeId={row.bookingTypeId} />
        <b>{typeName(row.bookingTypeId)}</b>
        <span key={now ?? 'none'} className={`pp-badge${now ? '' : ' none'}`}>{now ? roleLabel(now) : 'ללא תפקיד'}</span>
      </header>
      <div className="pp-card-roles">
        {rolesOf(row, roles).map((role) => (
          <button key={role} type="button" aria-pressed={now === role} disabled={Boolean(lock) || busy} onClick={() => onSetRole(row, now === role ? null : role)}>
            {roleLabel(role)}
          </button>
        ))}
      </div>
    </article>
  );
}

/**
 * The three main categories, closed at first: each header says how many of its domains hold a role and whether any has a
 * change waiting; pressing it opens (or closes) its domain cards.
 */
export function PermissionsCards({ matrix, edits, busy, changed, onSetRole, typeName }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  // the main categories (CategoryGroup): the service domains, ביטחון מידע, תקשוב
  const sections = groupBySection(matrix.rows, (row) => row.bookingTypeId).map((section) => ({ ...section, rows: section.items }));

  return (
    <div className="pp-cards">
      {sections.map((section) => {
        const isOpen = open.has(section.id);
        const assigned = section.rows.filter((row) => currentRole(row, edits)).length;
        const pending = section.rows.some((row) => isChanged(row, changed));
        return (
          <CategoryGroup
            key={section.id}
            section={section}
            className={pending ? 'pending' : ''}
            open={isOpen}
            onToggle={() => toggle(section.id)}
            // the count crossfades when it changes (the old text fades out as the new one fades in)
            summary={<AnimatedText>{assigned ? `${assigned} מתוך ${section.rows.length} תחומים משובצים` : `${section.rows.length} תחומים, אין שיבוץ`}</AnimatedText>}
            badge={<PendingTag show={pending} />}
          >
            <div className="pp-cards-grid">
              {section.rows.map((row, index) => (
                <DomainCard key={row.bookingTypeId} index={index} row={row} roles={matrix.roles} edits={edits} busy={busy} changed={changed} onSetRole={onSetRole} typeName={typeName} />
              ))}
            </div>
          </CategoryGroup>
        );
      })}
    </div>
  );
}
