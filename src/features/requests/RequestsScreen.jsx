'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Ticket } from '@/components/booking/Ticket';
import { AgeColumnsHeader } from '@/components/booking/RouteViz';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { usePresence } from '@/components/ui/usePresence';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { DomainFilter } from '@/features/queue/DomainFilter';
import { insightsApi } from '@/lib/api/endpoints';
import { LOAD_AHEAD_PX, MIN_LIST_HEIGHT, PAGE_SIZE } from '@/features/queue/constants';

import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { useSmoothHeight } from '@/components/ui/SmoothSize';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { bookingsApi, peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { STAGE_SHORT } from '@/lib/labels';
import { CONTENT_FADE_MS, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useSession } from '@/providers/SessionProvider';
import { workflowFilterOptions, normalizeWorkflowFilters } from './workflow-filters';
import { advancedCount, DEFAULT_FILTERS, parseFilters, SORTS, toApiParams, toSearchParams } from './filters';

/** Every booking the user may see; filters live in the URL so links and Back reproduce the list. */
export function RequestsScreen() {
  const { me, catalog, can, canAct } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const action = useStatusAction({ animateOut: true });

  const filters = useMemo(() => normalizeWorkflowFilters(parseFilters(new URLSearchParams(search.toString())), me, catalog), [search, me, catalog]);
  const [advancedOpen, setAdvancedOpen] = useState(() => advancedCount(filters) > 0);

  const update = useCallback(
    (patch, resetPage = true) => {
      const next = normalizeWorkflowFilters({ ...filters, ...patch, ...(resetPage ? { page: 1 } : {}) }, me, catalog);
      const query = toSearchParams(next, new URLSearchParams(search.toString())).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router, search, me, catalog],
  );

  useEffect(() => {
    const raw = parseFilters(new URLSearchParams(search.toString()));
    if (raw.stage === filters.stage && raw.statuses === filters.statuses) return;
    const query = toSearchParams({ ...filters, page: 1 }, new URLSearchParams(search.toString())).toString();
    router.replace(query ? pathname + '?' + query : pathname, { scroll: false });
  }, [filters, search, pathname, router]);

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
  // Keep the previous results mounted until their exit finishes, including an empty result.
  // Only a change of filters (tab, search, filter, sort) fades the list out and the new results in. Anything else for the
  // same filters - a reload after a decision (the decided row already slid out), a next page (only its rows fade in) -
  // replaces the rows in place. `shown` is what is on screen and which filters it belongs to.
  const filtersKey = JSON.stringify(apiParams);
  const [shown, setShown] = useState({ key: filtersKey, data: query.data });
  const settled = !query.isPlaceholderData && query.data !== undefined;
  if (shown.key === filtersKey && settled && shown.data !== query.data) setShown({ key: filtersKey, data: query.data });
  const resultsExiting = settled && shown.key !== filtersKey;
  useEffect(() => {
    if (!resultsExiting) return;
    const timer = window.setTimeout(() => setShown({ key: filtersKey, data: query.data }), prefersReducedMotion() ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [resultsExiting, filtersKey, query.data]);
  // while the new filters load, the old rows stay (dimmed); then they fade out and the new ones in
  const visibleData = shown.key === filtersKey || !settled ? (query.data ?? shown.data) : shown.data;
  const rows = visibleData?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  // The card ends at the bottom of the window and the list takes what the toolbar and filters leave, so only the list
  // scrolls. Capping the card (whose top never moves) rather than the list lets the list shrink and grow with the
  // filter panel's fold frame by frame, instead of jumping when it is measured again.
  const card = useRef(null);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const hasRows = rows.length > 0;
  useFitToWindow(card, MIN_LIST_HEIGHT);
  // the card glides from the skeleton's height to the list's (or the empty state's) instead of jumping
  useSmoothHeight(card, query.isPending ? 'loading' : hasRows ? 'rows' : 'empty');
  // the list fades in where the loading skeleton was (started from script so nothing in the cascade can skip it)
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!hasRows || !el || prefersReducedMotion()) return;
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: EASE_OUT });
    return () => fade.cancel();
  }, [hasRows]);
  // rows added by a next page fade in; the rows already shown stay as they are
  const shownCount = useRef(0);
  useLayoutEffect(() => {
    const before = shownCount.current;
    shownCount.current = rows.length;
    const list = scroller.current?.querySelector('.tickets');
    if (!list || before === 0 || rows.length <= before || prefersReducedMotion()) return;
    const fades = [...list.children].slice(before).map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: EASE_OUT }));
    return () => fades.forEach((fade) => fade.cancel());
  }, [rows.length]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
    // hasRows: the sentinel mounts only with the rows, which can come after the first page (the exit delay)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, hasRows]);

  // Handler filter options; only for users who manage users.
  const handlers = useQuery({ queryKey: keys.approvers(''), queryFn: ({ signal }) => peopleApi.approvers('', signal), enabled: can('users.manage'), staleTime: 5 * 60_000 });

  const overview = useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => insightsApi.overview(signal), enabled: canAct, staleTime: 60_000 });
  const waiting = overview.data?.awaiting_me?.count;

  const views = [
    { id: 'all', label: 'הכל' },
    { id: 'open', label: 'פתוחות' },
    ...(canAct ? [{ id: 'mine', label: 'ממתינות לי', count: waiting }] : []),
    { id: 'overdue', label: 'חורגות מיעד' },
    { id: 'decide', label: 'דורשות הכרעה' },
  ];

  const managedTypes = catalog.booking_types.filter((type) => me.managed_booking_types.includes(type.id));
  const filterOptions = workflowFilterOptions(me, catalog, filters.types);
  const advanced = advancedCount(filters);
  const hasFilters = advanced > 0 || filters.ids || filters.q;
  const clearPresence = usePresence(Boolean(hasFilters), 220);

  return (
    <div>
      <PageHead title="קריאות" center={me.is_handler_only ? <DomainFilter picked={filters.types && !filters.types.includes(',') ? Number(filters.types) : null} /> : null} sub={filters.view === 'mine' ? 'קריאות שממתינות לטיפולך לפי ההרשאות והשלב שלהן.' : 'כל הקריאות בתחומים שבאחריותך. קריאות נפתחות באפליקציה בלבד.'} />
      <section ref={card} className="card fit-card">
        <div className="toolbar">
          <Seg label="תצוגה" value={filters.view} onChange={(view) => update({ view })} options={views.map((view) => ({ value: view.id, label: view.label, count: view.count }))} />
          <SearchField id="requests-q" width={240} value={text} placeholder="מספר קריאה, מספר אישי או שם" aria-label="חיפוש לפי מספר קריאה, מספר אישי או שם" onChange={setText} />
          <div className="requests-filter-actions">
          <Button size="sm" icon="sliders" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((v) => !v)}>
            <AnimatedText>{advanced ? `סינון (${advanced})` : 'סינון'}</AnimatedText>
          </Button>
          {clearPresence.mounted ? (
            <Button size="sm" variant="ghost" icon="x" className="requests-clear" data-closing={clearPresence.closing || undefined} disabled={!hasFilters} aria-label="ניקוי הסינון" title="ניקוי הסינון" onClick={() => router.replace(filters.view === DEFAULT_FILTERS.view ? pathname : `${pathname}?view=${filters.view}`, { scroll: false })}>
            </Button>
          ) : null}
          </div>
          <span className="grow" />
          <AgeColumnsHeader />
          <div className="requests-sort-control">
          <label className="small muted" htmlFor="requests-sort">
            מיון
          </label>
          <Select autoWidth
            id="requests-sort"
            className="input requests-sort-select"
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
          </Select>
          </div>
        </div>


        {/* stays mounted so it can fade and fold both ways; inert while closed */}
        <div className={`adv-wrap${advancedOpen ? ' open' : ''}`} inert={!advancedOpen}>
          <div className="adv requests-filters">
            <Field label="תחום">
              <Select autoWidth className="input" value={filters.types} onChange={(event) => update({ types: event.target.value })}>
                <option value="">הכל</option>
                {managedTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.display_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="שלב">
              <Select autoWidth className="input" value={filters.stage} onChange={(event) => update({ stage: event.target.value })}>
                <option value="">הכל</option>
                {filterOptions.stages.map((id) => (
                  <option key={id} value={id}>
                    {STAGE_SHORT[id]}
                  </option>
                ))}

              </Select>
            </Field>
            <Field label="סטטוס">
              <Select autoWidth className="input requests-status-select" value={filters.statuses} onChange={(event) => update({ statuses: event.target.value })}>
                <option value="">הכל</option>
                {filterOptions.statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.display_name}
                  </option>
                ))}
              </Select>
            </Field>
            {handlers.data?.length ? (
              <Field label="גורם מטפל">
                <Select autoWidth className="input" value={filters.handler} onChange={(event) => update({ handler: event.target.value })}>
                  <option value="">הכל</option>
                  {handlers.data.map((person) => (
                    <option key={person.uuid} value={person.uuid}>
                      {person.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {me.is_super_admin ? (
              <Field label="יחידה">
                <Select autoWidth className="input" value={filters.units} onChange={(event) => update({ units: event.target.value })}>
                  <option value="">הכל</option>
                  {catalog.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {/* a div, not Field's <label>: a click on the open calendar must not be forwarded to its button */}
            <div className="field">
              <span>תאריך פתיחה</span>
              <DateRangePicker label="" value={{ from: filters.from, to: filters.to }} onChange={(range) => update({ from: range.from, to: range.to })} />
            </div>
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

        <div className="fit-fill" style={{ opacity: resultsExiting ? 0 : query.isPlaceholderData ? 0.55 : 1, transition: prefersReducedMotion() ? 'none' : 'opacity 180ms ease', pointerEvents: resultsExiting ? 'none' : undefined }}>
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
