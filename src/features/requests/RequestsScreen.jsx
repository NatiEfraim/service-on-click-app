'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Ticket } from '@/components/booking/Ticket';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { LOAD_AHEAD_PX, MIN_LIST_HEIGHT, PAGE_SIZE } from '@/features/queue/constants';

import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { useSmoothHeight } from '@/components/ui/SmoothSize';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { bookingsApi, peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { CONTENT_FADE_MS, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { useSession } from '@/providers/SessionProvider';
import { advancedCount, DEFAULT_FILTERS, parseFilters, SORTS, toApiParams, toSearchParams } from './filters';

/** Every booking the user may see; filters live in the URL so links and Back reproduce the list. */
export function RequestsScreen() {
  const { me, catalog, can, canAct } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const action = useStatusAction({ animateOut: true });

  const filters = useMemo(() => parseFilters(new URLSearchParams(search.toString())), [search]);
  const [advancedOpen, setAdvancedOpen] = useState(() => advancedCount(filters) > 0);

  const update = useCallback(
    (patch, resetPage = true) => {
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

  // Pages load as the list scrolls, so the URL's page is ignored.
  const apiParams = useMemo(() => toApiParams({ ...filters, page: 1 }, PAGE_SIZE), [filters]);
  const query = useInfiniteQuery({
    queryKey: [...keys.bookingList(apiParams), 'infinite'],
    queryFn: ({ pageParam, signal }) => bookingsApi.list({ ...apiParams, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: (previous) => previous,
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  // The card ends at the bottom of the window and the list takes what the toolbar and filters leave, so only the list
  // scrolls. Capping the card (whose top never moves) rather than the list lets the list shrink and grow with the
  // filter panel's fold frame by frame, instead of jumping when it is measured again.
  const card = useRef(null);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const hasRows = rows.length > 0;
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const page = el.closest('.page');
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const below = page ? parseFloat(getComputedStyle(page).paddingBottom) : 0;
      el.style.maxHeight = `${Math.max(MIN_LIST_HEIGHT, window.innerHeight - top - below)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  // the card glides from the skeleton's height to the list's (or the empty state's) instead of jumping
  useSmoothHeight(card, query.isPending ? 'loading' : hasRows ? 'rows' : 'empty');
  // the list fades in where the loading skeleton was (started from script so nothing in the cascade can skip it)
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!hasRows || !el || prefersReducedMotion()) return;
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: EASE_OUT });
    return () => fade.cancel();
  }, [hasRows]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handler filter options; only for users who manage users.
  const handlers = useQuery({ queryKey: keys.approvers(''), queryFn: ({ signal }) => peopleApi.approvers('', signal), enabled: can('users.manage'), staleTime: 5 * 60_000 });

  const views = [
    { id: 'open', label: 'פתוחות' },
    ...(canAct ? [{ id: 'mine', label: 'ממתינות לי' }] : []),
    { id: 'overdue', label: 'חורגות מיעד' },
    { id: 'decide', label: 'דורשות הכרעה' },
    { id: 'all', label: 'הכל' },
  ];

  const managedTypes = catalog.booking_types.filter((type) => me.managed_booking_types.includes(type.id));
  const advanced = advancedCount(filters);
  const hasFilters = advanced > 0 || filters.ids || filters.q;

  return (
    <div>
      <PageHead title="קריאות" sub="כל הקריאות בתחומים שבאחריותך. קריאות נפתחות באפליקציה בלבד." />
      <section ref={card} className="card fit-card">
        <div className="toolbar">
          <Seg label="תצוגה" value={filters.view} onChange={(view) => update({ view })} options={views.map((view) => ({ value: view.id, label: view.label }))} />
          <SearchField id="requests-q" width={240} value={text} placeholder="מספר קריאה, מספר אישי או שם" aria-label="חיפוש לפי מספר קריאה, מספר אישי או שם" onChange={setText} />
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
            style={{ paddingBlock: 5 }}
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

        {/* stays mounted so it can fade and fold both ways; inert while closed */}
        <div className={`adv-wrap${advancedOpen ? ' open' : ''}`} inert={!advancedOpen}>
          <div className="adv">
            <Field label="תחום">
              <select className="input" value={filters.types} onChange={(event) => update({ types: event.target.value })}>
                <option value="">הכל</option>
                {managedTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="שלב">
              <select className="input" value={filters.stage} onChange={(event) => update({ stage: event.target.value })}>
                <option value="">הכל</option>
                {STAGE_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {STAGE_SHORT[id]}
                  </option>
                ))}
                <option value="closed">סגורה</option>
              </select>
            </Field>
            <Field label="סטטוס">
              <select className="input" value={filters.statuses} onChange={(event) => update({ statuses: event.target.value })}>
                <option value="">הכל</option>
                {catalog.statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.display_name}
                  </option>
                ))}
              </select>
            </Field>
            {handlers.data?.length ? (
              <Field label="גורם מטפל">
                <select className="input" value={filters.handler} onChange={(event) => update({ handler: event.target.value })}>
                  <option value="">הכל</option>
                  {handlers.data.map((person) => (
                    <option key={person.uuid} value={person.uuid}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {me.is_super_admin ? (
              <Field label="יחידה">
                <select className="input" value={filters.units} onChange={(event) => update({ units: event.target.value })}>
                  <option value="">הכל</option>
                  {catalog.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="נפתחה מ-">
              <input className="input" type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
            </Field>
            <Field label="עד">
              <input className="input" type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
            </Field>
          </div>
        </div>

        {filters.ids ? (
          <div className="toolbar" style={{ background: 'var(--info-w)' }}>
            <span>מוצגות {filters.ids.split(',').length} קריאות שמרכיבות את המדד שנבחר.</span>
            <Button size="sm" variant="ghost" onClick={() => update({ ids: '' })}>
              הצגת הכל
            </Button>
          </div>
        ) : null}

        <div className="fit-fill" style={{ opacity: query.isPlaceholderData ? 0.55 : 1, transition: 'opacity .15s' }}>
          {query.isPending ? (
            <div className="card-body">
              <Loading rows={8} />
            </div>
          ) : query.isError && !hasRows ? (
            <div className="card-body fade-in">
              <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
            </div>
          ) : hasRows ? (
            // the next page loads as the bottom of the list scrolls into view
            <div ref={scroller} className="queue-scroll">
              <div className="tickets" aria-busy={query.isFetching || undefined}>
                {rows.map((row) => (
                  <Ticket key={row.serial_number} booking={row} onAction={action.start} outcome={action.outcomes[row.serial_number]} />
                ))}
              </div>
              <div ref={sentinel} />
              {isFetchingNextPage ? (
                <div className="card-body">
                  <Loading rows={2} />
                </div>
              ) : hasNextPage ? null : (
                <div className="pager">
                  <span>הוצגו כל {total} הקריאות.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="fade-in">
              <EmptyState title="אין קריאות שמתאימות">אפשר לבחור תצוגה אחרת או לנקות את הסינון.</EmptyState>
            </div>
          )}
        </div>
      </section>
      {action.dialog}
    </div>
  );
}
