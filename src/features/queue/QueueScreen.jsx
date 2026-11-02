'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Ticket } from '@/components/booking/Ticket';
import { Seg } from '@/components/ui/Controls';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { useDebounced } from '@/lib/useDebounced';
import { useSession } from '@/providers/SessionProvider';
import { CARD_EDGE, LOAD_AHEAD_PX, MIN_LIST_HEIGHT, PAGE_SIZE, SEARCH_DELAY_MS } from './constants';

/** Bookings waiting for this user (`mine=1`), longest-waiting first; searched and filtered by stage on the server, 25 at a time. */
export function QueueScreen() {
  const { me, canAct } = useSession();
  const [stage, setStage] = useState('');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), SEARCH_DELAY_MS);
  const action = useStatusAction({ animateOut: true });

  const params = { mine: true, open_only: true, per_page: PAGE_SIZE, sort: 'stage_age_hours', dir: 'desc', q, stage };
  const query = useInfiniteQuery({
    queryKey: [...keys.bookingList(params), 'infinite'],
    queryFn: ({ pageParam, signal }) => bookingsApi.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: (previous) => previous,
  });

  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;
  const filtered = Boolean(q || stage);
  const title = me.is_handler_only ? 'הקריאות שלי לטיפול' : 'ממתין לטיפולי';

  // the unfiltered count, remembered while a filter is on
  const [summary, setSummary] = useState('');
  const current = query.isSuccess && !filtered && !query.isPlaceholderData ? (total ? `${total} קריאות נמצאות עכשיו בשלב שלך.` : 'אין כרגע קריאות שממתינות לטיפול שלך.') : '';
  if (current && current !== summary) setSummary(current);

  // stage buttons: every stage seen so far, kept while a filter narrows the list
  const [seenStages, setSeenStages] = useState([]);
  const fresh = rows.map((row) => row.stage).filter((id) => !seenStages.includes(id));
  if (fresh.length) setSeenStages([...seenStages, ...new Set(fresh)]);
  const stages = STAGE_ORDER.filter((id) => seenStages.includes(id) || id === stage);

  // the next 25 load as the bottom of the list scrolls into view
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const hasRows = rows.length > 0;

  // the list ends at the bottom of the window, so only the list scrolls and the page never does
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const page = el.closest('.page');
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const below = (page ? parseFloat(getComputedStyle(page).paddingBottom) : 0) + CARD_EDGE;
      el.style.maxHeight = `${Math.max(MIN_LIST_HEIGHT, window.innerHeight - top - below)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
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

  return (
    <div className="narrow">
      <PageHead
        title={title}
        sub={
          // the line keeps its place and only fades, so switching a filter never moves the page
          <span className={`fade-swap${summary && !filtered ? '' : ' hidden'}`} aria-hidden={filtered || undefined}>
            {summary || ' '}
          </span>
        }
      />
      <SmoothSize as="section" className="card">
        <div className="toolbar">
          <SearchField width={220} value={text} placeholder="חיפוש קריאה" title="מספר קריאה, מספר אישי, ת.ז. או שם" aria-label="חיפוש בקריאות שלי לפי מספר קריאה, מספר אישי, ת.ז. או שם" onChange={setText} />
          {stages.length > 1 || stage ? (
            <Seg label="שלב" value={stage} onChange={setStage} options={[{ value: '', label: 'הכל' }, ...stages.map((id) => ({ value: id, label: STAGE_SHORT[id] }))]} />
          ) : null}
          <span className="grow" />
          {query.isSuccess ? <span className="small muted">{filtered ? `${total} תוצאות` : 'ממוין לפי זמן ההמתנה בשלב'}</span> : null}
        </div>

        {query.isPending ? (
          <div className="card-body">
            <Loading rows={6} />
          </div>
        ) : query.isError && !rows.length ? (
          <div className="card-body">
            <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState title="לא נמצאו קריאות">נסו מספר קריאה, מספר אישי או שם אחר, או בחרו שלב אחר.</EmptyState>
          ) : (
            <EmptyState title={canAct ? 'אין משימות פתוחות' : 'אין לך תפקיד מאשר'}>
              {canAct ? 'קריאה חדשה שתגיע לשלב שבאחריותך תופיע כאן.' : 'בתפקידך את/ה צופה בקריאות. אישור ודחייה מתבצעים ע"י בעל התפקיד שהתור שלו במסלול.'}
            </EmptyState>
          )
        ) : (
          <>
            {/* the list scrolls inside the card; the toolbar stays in view */}
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
              ) : hasNextPage ? null : rows.length > PAGE_SIZE ? (
                <div className="pager">
                  <span>הוצגו כל {total} הקריאות.</span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </SmoothSize>
      {action.dialog}
    </div>
  );
}
