'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { Select } from '@/components/ui/Select';
import { usePresence } from '@/components/ui/usePresence';
import { auditApi, peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { fmtDateTime } from '@/lib/format';
import { sourceTag } from '@/lib/labels';
import { EASE_IN, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { useSession } from '@/providers/SessionProvider';
import { grantsFromPermissionNames, parsePermissionName, roleLabel } from '@/features/people/permissions';
import { ACTION_GROUPS, actionLabel, changedFields, ENTITY_LABEL, fieldLabel, listChange, mergeOneSave, RESULT } from './labels';

/** How long an opened row's details take to fold open and to fold away. */
const DETAIL_ENTER_MS = 260;
const DETAIL_EXIT_MS = 200;
/** The table never gets shorter than this when the window is small. */
const MIN_TABLE_HEIGHT = 320;

const EMPTY = { q: '', action: '', type: '', result: '', from: '', to: '' };

/** The chain check, run on demand (it walks the whole log). */
function VerifyButton() {
  const [asked, setAsked] = useState(false);
  const verify = useQuery({ queryKey: keys.auditVerify, queryFn: ({ signal }) => auditApi.verify(signal), enabled: asked, staleTime: 0 });
  if (verify.isSuccess) {
    return verify.data.valid ? (
      <span className="chip ok">ההיסטוריה תקינה ({verify.data.checked} רשומות נבדקו)</span>
    ) : (
      <span className="chip bad">נמצא שינוי חשוד ברשומה {verify.data.broken_at}</span>
    );
  }
  return (
    <Button size="sm" icon="check" loading={verify.isFetching} onClick={() => (asked ? void verify.refetch() : setAsked(true))}>
      {verify.isError ? 'הבדיקה נכשלה - נסו שוב' : 'אימות ההיסטוריה'}
    </Button>
  );
}

/** The opened row's details: they glide open and fade in, and stay on screen while they fade and fold away. */
function AuditDetail({ open, children }) {
  // kept mounted for the text fade (60ms head start) plus the fold
  const presence = usePresence(open, DETAIL_EXIT_MS + 60);
  const fold = useRef(null);

  // the height glides between 0 and the content's (measured in pixels: a table row cannot animate to `auto`)
  useLayoutEffect(() => {
    const el = fold.current;
    if (!el || prefersReducedMotion()) return;
    const body = el.firstElementChild;
    // measured from where it is now (a close during the open starts from the current height, not the full one)
    const from = `${el.getBoundingClientRect().height}px`;
    const full = `${el.scrollHeight}px`;
    let height;
    let fade;
    if (presence.closing) {
      // the text fades first, quickly, then the room closes - so it never shows squashed
      fade = body?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE_IN, fill: 'forwards' });
      height = el.animate([{ height: from, overflow: 'hidden' }, { height: '0px', overflow: 'hidden' }], { duration: DETAIL_EXIT_MS, delay: 60, easing: EASE_IN, fill: 'forwards' });
    } else {
      // the room opens, and the text fades in a moment later into it
      height = el.animate([{ height: '0px', overflow: 'hidden' }, { height: full, overflow: 'hidden' }], { duration: DETAIL_ENTER_MS, easing: EASE_OUT });
      fade = body?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 60, easing: EASE_OUT, fill: 'backwards' });
    }
    return () => {
      height.cancel();
      fade?.cancel();
    };
  }, [presence.mounted, presence.closing]);

  if (!presence.mounted) return null;
  return (
    <tr className="audit-detail">
      <td colSpan={6}>
        <div ref={fold} className="audit-fold">
          <div className="audit-detail-body">{children}</div>
        </div>
      </td>
    </tr>
  );
}

/** The person a row acted on (a user change), looked up once per person and kept; null when it acted on something else. */
function useTargetPerson(row) {
  const person = row.entity_type === 'user' && row.entity_id && !row.booking_serial ? String(row.entity_id) : null;
  const user = useQuery({
    queryKey: ['audit', 'person', person],
    queryFn: async ({ signal }) => {
      const found = await peopleApi.users(person, 1, signal);
      const list = Array.isArray(found) ? found : (found?.data ?? []);
      // the same number, ignoring leading zeros
      const same = (value) => String(value ?? '').replace(/^0+/, '') === person.replace(/^0+/, '');
      return list.find((candidate) => same(candidate.personal_number)) ?? null;
    },
    enabled: person !== null,
    staleTime: Infinity,
    // many rows can name people at once and the API throttles: try again, spaced out, instead of giving up
    retry: 4,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
  return person
    ? { personalNumber: person, name: user.data?.name ?? null, permissions: user.data?.permissions ?? null, loading: user.isPending, failed: user.isError || (user.isSuccess && user.data === null) }
    : null;
}

/** What a row acted on, by name: a booking by number, a person by full name, else the entity. */
function AuditTarget({ row }) {
  const person = useTargetPerson(row);
  const drawer = useBookingDrawer();
  if (row.booking_serial) {
    return (
      <span className="audit-booking">
        קריאה {row.booking_serial}
        {/* the same booking panel the other screens open, from the side */}
        <button
          type="button"
          className="audit-peek-btn"
          aria-label={`פרטי קריאה ${row.booking_serial}`}
          title="פרטי הקריאה"
          onClick={(event) => {
            event.stopPropagation();
            drawer.open(row.booking_serial);
          }}
        >
          <Icon name="eye" />
        </button>
      </span>
    );
  }
  if (person) return person.name ?? (person.loading ? 'טוען...' : `משתמש ${person.personalNumber}`);
  return row.entity_id ? `${ENTITY_LABEL[row.entity_type] ?? row.entity_type} ${row.entity_id}` : (ENTITY_LABEL[row.entity_type] ?? row.entity_type);
}

/** The opened row's "who": the full name and personal number of whoever acted, and of the person changed. */
function AuditPeople({ row }) {
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

/** An icon per role in the permissions peek. */
const ROLE_ICON = { admin: 'shield', approver: 'check', vice_approver: 'users', transportation_control_officer: 'car' };

/** An eye beside the changed person: a quick look at the permissions they hold now, grouped by role. */
function PermissionsPeek({ person }) {
  const { typeName } = useSession();
  const [open, setOpen] = useState(false);
  const presence = usePresence(open);
  const ref = useRef(null);
  const popRef = useRef(null);
  // the card renders in <body> (the table's scroll box would clip it) and is placed by the eye: below it, or above it
  // when the window has no room below, and kept inside the window sideways
  const [place, setPlace] = useState(null);

  useLayoutEffect(() => {
    // measured again (before paint) every time it opens
    if (!presence.mounted) return;
    const measure = () => {
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
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [presence.mounted, person.loading]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => !ref.current?.contains(event.target) && !popRef.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const grants = person.permissions ? grantsFromPermissionNames(person.permissions.map((permission) => permission.name)) : [];

  return (
    <span ref={ref} className="audit-peek">
      <button type="button" className="audit-peek-btn" aria-expanded={open} aria-label={`ההרשאות הנוכחיות של ${person.name ?? 'המשתמש'}`} title="הצצה בהרשאות הנוכחיות" onClick={(event) => { event.stopPropagation(); setOpen(!open); }}>
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

/** One value of before / after, readable: status ids by name, booleans as yes / no. */
function useShowValue() {
  const { statusLabel, typeName } = useSession();
  // "admin_8" → "מפקד מחנה - הובלות"
  const permission = (name) => {
    const parsed = parsePermissionName(String(name));
    return parsed ? `${roleLabel(parsed.role)} - ${typeName(parsed.bookingTypeId)}` : roleLabel(String(name));
  };
  return (key, value) => {
    if (Array.isArray(value) && (key === 'permissions' || key === 'roles')) return value.length ? value.map(permission).join(', ') : 'ללא';
    if (value === undefined || value === null || value === '') return '—';
    if ((key === 'status_id' || key === 'parked_status_id') && typeof value === 'number') return statusLabel(value);
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
}

/** Super admin: who changed what and when, newest first; a row opens its before / after. */
/** One filtered audit list, page by page (`enabled` off: an idle query that returns nothing). */
function useAuditPages(params, enabled) {
  return useInfiniteQuery({
    queryKey: keys.audit(params),
    queryFn: ({ pageParam, signal }) => auditApi.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function AuditScreen() {
  const { catalog } = useSession();
  const show = useShowValue();
  const [filters, setFilters] = useState(EMPTY);
  const [searchText, setSearchText] = useState('');
  const [open, setOpen] = useState(null);
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));

  // the search waits a moment so every key press is not a request
  useEffect(() => {
    const timer = window.setTimeout(() => update({ q: searchText.replace(/\D/g, '') }), 350);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  // One search box for a booking number or a person's number. Both can be 7 digits and the API filters them apart, so a
  // search asks both ways (as a booking, as the person who acted) and shows the two answers as one list, newest first.
  const { q, ...base } = filters;
  const bySerial = useAuditPages(q ? { ...base, serial: q } : base, true);
  const byActor = useAuditPages({ ...base, actor: q }, Boolean(q));
  const lists = q ? [bySerial, byActor] : [bySerial];
  const query = {
    isPending: lists.some((list) => list.isPending),
    isError: lists.every((list) => list.isError),
    error: bySerial.error ?? byActor.error,
    isSuccess: lists.some((list) => list.isSuccess),
    isPlaceholderData: lists.some((list) => list.isPlaceholderData),
    refetch: () => Promise.all(lists.map((list) => list.refetch())),
    hasNextPage: lists.some((list) => list.hasNextPage),
    isFetchingNextPage: lists.some((list) => list.isFetchingNextPage),
    fetchNextPage: () => Promise.all(lists.filter((list) => list.hasNextPage && !list.isFetchingNextPage).map((list) => list.fetchNextPage())),
  };
  const seen = new Set();
  const rows = mergeOneSave(
    lists
      .flatMap((list) => list.data?.pages.flatMap((page) => page.data) ?? [])
      .filter((row) => (seen.has(row.id) ? false : seen.add(row.id)))
      .sort((a, b) => b.id - a.id),
  );
  const total = lists.reduce((sum, list) => sum + (list.data?.pages[0]?.meta.total ?? 0), 0);

  // the card ends at the window's bottom and only the table scrolls inside it
  const card = useRef(null);
  const scroller = useRef(null);
  useFitToWindow(card, MIN_TABLE_HEIGHT);

  // the next page loads as the bottom of the table scrolls into view
  const sentinel = useRef(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: '0px 0px 400px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

  const filtered = Object.values(filters).some(Boolean);

  return (
    <div>
      <PageHead title="היסטוריית שינויים" hideTitle />
      <section ref={card} className="card fit-card">
        <div className="toolbar">
          <SearchField id="audit-search" width={220} value={searchText} placeholder="חיפוש" aria-label="חיפוש לפי מספר קריאה או מספר אישי" inputMode="numeric" onChange={setSearchText} />
          <Select autoWidth value={filters.action} aria-label="סוג פעולה" onChange={(event) => update({ action: event.target.value })}>
            <option value="">כל הפעולות</option>
            {ACTION_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </Select>
          <Select autoWidth value={filters.type} aria-label="תחום" onChange={(event) => update({ type: event.target.value })}>
            <option value="">כל התחומים</option>
            {catalog.booking_types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.display_name}
              </option>
            ))}
          </Select>
          <Select autoWidth value={filters.result} aria-label="תוצאה" onChange={(event) => update({ result: event.target.value })}>
            <option value="">כל התוצאות</option>
            {Object.entries(RESULT).map(([value, result]) => (
              <option key={value} value={value}>
                {result.label}
              </option>
            ))}
          </Select>
          <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(range) => update(range)} />
          {filtered ? (
            <Button size="sm" variant="ghost" icon="x" onClick={() => { setFilters(EMPTY); setSearchText(''); }}>
              ניקוי
            </Button>
          ) : null}
          {/* the count and the integrity check close the bar */}
          <span className="report-export">
            {query.isSuccess ? <span className="hint">{total} רשומות</span> : null}
            <VerifyButton />
          </span>
        </div>

        {query.isPending ? (
          <div className="card-body"><Loading rows={8} /></div>
        ) : query.isError && rows.length === 0 ? (
          <div className="card-body"><ErrorNotice error={query.error} onRetry={() => void query.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="card-body"><EmptyState title={filtered ? 'אין רשומות שמתאימות לסינון.' : 'עדיין אין רשומות בהיסטוריה.'} /></div>
        ) : (
          <div className={`fit-fill${query.isPlaceholderData ? ' is-stale' : ''}`}>
          <div ref={scroller} className="queue-scroll audit-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>מתי</th>
                  <th>מי</th>
                  <th>פעולה</th>
                  <th>על מה</th>
                  <th>מקור</th>
                  <th>תוצאה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = open === row.id;
                  const result = RESULT[row.result] ?? { label: row.result, tone: '' };
                  const source = sourceTag(row.source);
                  const changes = changedFields(row.before, row.after);
                  return (
                    <Fragment key={row.id}>
                      <tr className={`clk${isOpen ? ' audit-open' : ''}`} aria-expanded={isOpen} tabIndex={0} onClick={() => setOpen(isOpen ? null : row.id)} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), setOpen(isOpen ? null : row.id))}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(row.occurred_at)}</td>
                        <td>
                          {row.actor_type === 'system' ? 'המערכת' : row.actor_name ?? '—'}
                        </td>
                        <td>{actionLabel(row.action)}</td>
                        <td><AuditTarget row={row} /></td>
                        <td>{source ? <span className={`tag ${source.tone}`}>{source.label}</span> : '—'}</td>
                        <td><span className={`chip ${result.tone}`}>{result.label}</span></td>
                      </tr>
                      <AuditDetail open={isOpen}>
                            <AuditPeople row={row} />
                            {row.reason ? <p><b>{row.result === 'success' ? 'הערה' : 'סיבה'}:</b> {row.reason}</p> : null}
                            {changes.length ? (
                              <table className="t audit-diff">
                                <thead>
                                  <tr><th>שדה</th><th>לפני</th><th>אחרי</th></tr>
                                </thead>
                                <tbody>
                                  {changes.map((change) => {
                                    const lists = listChange(change);
                                    return lists ? (
                                      <tr key={change.key}>
                                        <td>{fieldLabel(change.key)}</td>
                                        {/* what was taken away under "before", what was given under "after", one item a line */}
                                        <td>
                                          <span className="audit-items">
                                            {lists.removed.length
                                              ? lists.removed.map((item) => <span key={item} className="chip bad">− {show(change.key, [item])}</span>)
                                              : <span className="hint">—</span>}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="audit-items">
                                            {lists.added.length
                                              ? lists.added.map((item) => <span key={item} className="chip ok">+ {show(change.key, [item])}</span>)
                                              : <span className="hint">—</span>}
                                          </span>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr key={change.key}>
                                        <td>{fieldLabel(change.key)}</td>
                                        <td>{show(change.key, change.before)}</td>
                                        <td><b>{show(change.key, change.after)}</b></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : !row.reason ? <p className="hint">אין פרטים נוספים לפעולה זו.</p> : null}
                      </AuditDetail>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div ref={sentinel} />
            {isFetchingNextPage ? <div className="card-body"><Loading rows={2} /></div> : null}
          </div>
          </div>
        )}
      </section>
    </div>
  );
}
