'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Controls';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { bookingsApi, peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { advancedCount, DEFAULT_FILTERS, parseFilters, SORTS, toApiParams, toSearchParams, type RequestFilters, type ViewId } from './filters';

/** Every booking the user may see; filters live in the URL so links and Back reproduce the list. */
export function RequestsScreen() {
  const { me, catalog, can, canAct } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const action = useStatusAction();

  const filters = useMemo(() => parseFilters(new URLSearchParams(search.toString())), [search]);
  const [advancedOpen, setAdvancedOpen] = useState(() => advancedCount(filters) > 0);

  const update = useCallback(
    (patch: Partial<RequestFilters>, resetPage = true) => {
      const next = { ...filters, ...patch, ...(resetPage ? { page: 1 } : {}) };
      const query = toSearchParams(next, new URLSearchParams(search.toString())).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router, search],
  );

  // The box updates the URL after a pause and follows URL changes (Back, clear); synced during render.
  const [text, setText] = useState(filters.q);
  const [seenQ, setSeenQ] = useState(filters.q);
  if (filters.q !== seenQ) {
    setSeenQ(filters.q);
    setText(filters.q);
  }
  useEffect(() => {
    if (text.trim() === filters.q) return;
    const timer = window.setTimeout(() => update({ q: text.trim() }), 300);
    return () => window.clearTimeout(timer);
  }, [text, filters.q, update]);

  const apiParams = useMemo(() => toApiParams(filters), [filters]);
  const query = useQuery({ queryKey: keys.bookingList(apiParams), queryFn: ({ signal }) => bookingsApi.list(apiParams, signal), placeholderData: (previous) => previous });

  // Handler filter options; only for users who manage users.
  const handlers = useQuery({ queryKey: keys.approvers(''), queryFn: ({ signal }) => peopleApi.approvers('', signal), enabled: can('users.manage'), staleTime: 5 * 60_000 });

  const views: { id: ViewId; label: string }[] = [
    { id: 'open', label: 'פתוחות' },
    ...(canAct ? [{ id: 'mine' as const, label: 'ממתינות לי' }] : []),
    { id: 'overdue', label: 'חורגות מיעד' },
    { id: 'decide', label: 'דורשות הכרעה' },
    { id: 'all', label: 'הכל' },
  ];

  const managedTypes = catalog.booking_types.filter((type) => me.managed_booking_types.includes(type.id));
  const advanced = advancedCount(filters);
  const result = query.data;
  const hasFilters = advanced > 0 || filters.ids || filters.q;

  return (
    <div className="narrow">
      <PageHead title="קריאות" sub="כל הקריאות בתחומים שבאחריותך. קריאות נפתחות באפליקציה בלבד." />
      <section className="card">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="תצוגה">
            {views.map((view) => (
              <button key={view.id} type="button" aria-pressed={filters.view === view.id} onClick={() => update({ view: view.id })}>
                {view.label}
              </button>
            ))}
          </div>
          <div className="search" style={{ width: 240 }}>
            <Icon name="search" />
            <input
              id="requests-q"
              value={text}
              placeholder="מספר קריאה, מספר אישי או שם"
              aria-label="חיפוש לפי מספר קריאה, מספר אישי או שם"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <Button size="sm" icon="sliders" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((v) => !v)}>
            סינון{advanced ? ` (${advanced})` : ''}
          </Button>
          {hasFilters ? (
            <Button size="sm" variant="ghost" onClick={() => router.replace(filters.view === DEFAULT_FILTERS.view ? pathname : `${pathname}?view=${filters.view}`, { scroll: false })}>
              ניקוי
            </Button>
          ) : null}
          <span className="grow" />
          <label className="small muted" htmlFor="requests-sort">
            מיון
          </label>
          <select
            id="requests-sort"
            className="input"
            style={{ padding: '5px 8px' }}
            value={`${filters.sort}|${filters.dir}`}
            onChange={(event) => {
              const chosen = SORTS.find((s) => s.value === event.target.value);
              if (chosen) update({ sort: chosen.sort, dir: chosen.dir });
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {advancedOpen ? (
          <div className="adv">
            <label className="field">
              <span>תחום</span>
              <select className="input" value={filters.types} onChange={(event) => update({ types: event.target.value })}>
                <option value="">הכל</option>
                {managedTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>שלב</span>
              <select className="input" value={filters.stage} onChange={(event) => update({ stage: event.target.value })}>
                <option value="">הכל</option>
                {STAGE_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {STAGE_SHORT[id]}
                  </option>
                ))}
                <option value="closed">סגורה</option>
              </select>
            </label>
            <label className="field">
              <span>סטטוס</span>
              <select className="input" value={filters.statuses} onChange={(event) => update({ statuses: event.target.value })}>
                <option value="">הכל</option>
                {catalog.statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.display_name}
                  </option>
                ))}
              </select>
            </label>
            {handlers.data?.length ? (
              <label className="field">
                <span>גורם מטפל</span>
                <select className="input" value={filters.handler} onChange={(event) => update({ handler: event.target.value })}>
                  <option value="">הכל</option>
                  {handlers.data.map((person) => (
                    <option key={person.uuid} value={person.uuid}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {me.is_super_admin ? (
              <label className="field">
                <span>יחידה</span>
                <select className="input" value={filters.units} onChange={(event) => update({ units: event.target.value })}>
                  <option value="">הכל</option>
                  {catalog.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>נפתחה מ-</span>
              <input className="input" type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
            </label>
            <label className="field">
              <span>עד</span>
              <input className="input" type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
            </label>
          </div>
        ) : null}

        {filters.ids ? (
          <div className="toolbar" style={{ background: 'var(--info-w)' }}>
            <span>מוצגות {filters.ids.split(',').length} קריאות שמרכיבות את המדד שנבחר.</span>
            <Button size="sm" variant="ghost" onClick={() => update({ ids: '' })}>
              הצגת הכל
            </Button>
          </div>
        ) : null}

        <div style={{ opacity: query.isFetching && result ? 0.55 : 1, transition: 'opacity .15s' }}>
          {query.isPending ? (
            <div className="card-body">
              <Loading rows={8} />
            </div>
          ) : query.isError ? (
            <div className="card-body">
              <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
            </div>
          ) : result && result.data.length > 0 ? (
            <>
              <div className="tickets">
                {result.data.map((row) => (
                  <Ticket key={row.serial_number} booking={row} onAction={action.start} />
                ))}
              </div>
              <Pager page={result.meta.page} lastPage={result.meta.last_page} total={result.meta.total} onPage={(page) => update({ page }, false)} />
            </>
          ) : (
            <EmptyState title="אין קריאות שמתאימות">אפשר לבחור תצוגה אחרת או לנקות את הסינון.</EmptyState>
          )}
        </div>
      </section>
      {action.dialog}
    </div>
  );
}
