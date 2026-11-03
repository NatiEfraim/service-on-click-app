'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { matchesRequesterSearch } from './search';
import { Logo } from '@/components/layout/Logo';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/Chips';
import { Seg } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/SearchField';
import { useDebounced } from '@/lib/useDebounced';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { FadeIn } from '@/components/ui/FadeIn';
import { PageHead } from '@/components/ui/PageHead';
import { LOAD_AHEAD_PX } from '@/features/queue/constants';
import { OPEN_STATUS_IDS, requesterApi } from '@/lib/api/endpoints';
import { APP_NAME } from '@/lib/config';
import { initials } from '@/lib/format';
import { useFitToWindow } from '@/lib/useFitToWindow';

/** GET /bookings/my-bookings pages (PaginationEnum::PER_PAGE on the API). */
const REQUESTER_PAGE_SIZE = 20;

/**
 * What a plain user (no management role) sees: the bookings they opened in the mobile app, open ones first.
 * Built on the requester endpoints the mobile app uses (GET /user, GET /bookings/my-bookings), so the API is unchanged.
 * `fallback` is shown when even GET /user fails (the account is not a known user).
 */
export function RequesterHome({ onSignOut, fallback }) {
  const [view, setView] = useState('open');
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 300);
  const user = useQuery({ queryKey: ['requester', 'user'], queryFn: ({ signal }) => requesterApi.user(signal), retry: false });

  const bookings = useInfiniteQuery({
    queryKey: ['requester', 'bookings', view, 'free-text'],
    queryFn: ({ pageParam, signal }) => requesterApi.myBookings(pageParam, view === 'open' ? OPEN_STATUS_IDS : null, signal),
    initialPageParam: 1,
    // the API wraps the page as {data: [...]} without paging meta: a full page means more may exist, a short one is the end
    getNextPageParam: (last, pages) => ((last.data?.length ?? 0) >= REQUESTER_PAGE_SIZE ? pages.length + 1 : undefined),
    enabled: user.isSuccess,
    placeholderData: (previous) => previous,
  });
  const loadedRows = useMemo(() => bookings.data?.pages.flatMap((page) => page.data ?? []) ?? [], [bookings.data]);
  const rows = useMemo(() => loadedRows.filter((row) => matchesRequesterSearch(row, query)), [loadedRows, query]);
  const countLabel = `${rows.length}${bookings.hasNextPage ? '+' : ''} קריאות`;

  // the card ends at the window's bottom; the next 20 load as the bottom of the list scrolls into view
  const card = useRef(null);
  useFitToWindow(card, 240, user.isSuccess);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = bookings;
  useEffect(() => {
    if (query && hasNextPage && !bookings.isFetching && !bookings.isError && !bookings.isPlaceholderData) {
      void fetchNextPage();
    }
  }, [query, hasNextPage, bookings.isFetching, bookings.isError, bookings.isPlaceholderData, loadedRows.length, fetchNextPage]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || query) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, view, query, bookings.isPending, rows.length]);

  if (user.isError) return fallback;
  if (user.isPending) return <div className="login-wrap"><Loading rows={3} /></div>;

  const name = user.data?.full_name ?? user.data?.personal_number ?? '';

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <span className="brand">
            <Logo />
            <div>
              <b>{APP_NAME}</b>
              <span>הקריאות שלי</span>
            </div>
          </span>
          <div className="top-tools">
            <span className="userbtn" style={{ cursor: 'default' }}>
              <span className="avatar">{initials(name)}</span>
              <span className="nm">
                {name}
                <small>משתמש</small>
              </span>
            </span>
            <Button size="sm" icon="logout" onClick={() => void onSignOut()}>
              התנתקות
            </Button>
          </div>
        </div>
      </header>
      <main className="page">
        <FadeIn>
          <PageHead title="הקריאות שלי" sub="הקריאות שפתחת באפליקציה. פתיחת קריאה חדשה וביטול נעשים באפליקציה בלבד." />
          <section ref={card} className="card fit-card">
            <div className="toolbar">
              <Seg
                label="תצוגה"
                value={view}
                onChange={setView}
                options={[
                  { value: 'open', label: 'פתוחות' },
                  { value: 'all', label: 'הכל' },
                ]}
              />
              <SearchField width={240} value={search} onChange={setSearch} placeholder="מספר קריאה או קטגוריה" aria-label="חיפוש בקריאות שלי לפי מספר קריאה או קטגוריה" />
              <span className="grow" />
              {bookings.isSuccess ? <span className="small muted">{countLabel}</span> : null}
            </div>
            <FadeIn key={`${view}:${query}`} className="fit-fill" style={{ opacity: bookings.isPlaceholderData ? 0.55 : 1, transition: 'opacity .15s' }}>
              {bookings.isPending || (query && hasNextPage && !rows.length && !bookings.isError) ? (
                <div className="card-body">
                  <Loading rows={6} />
                </div>
              ) : bookings.isError && !rows.length ? (
                <div className="card-body">
                  <ErrorNotice error={bookings.error} onRetry={() => void bookings.refetch()} />
                </div>
              ) : rows.length === 0 ? (
                <EmptyState title={query ? 'לא נמצאו קריאות התואמות לחיפוש' : view === 'open' ? 'אין לך קריאות פתוחות' : 'עדיין לא פתחת קריאות'}>
                  {query ? 'נסה מספר קריאה או קטגוריה אחרים, או נקה את החיפוש. לחיפוש גם בקריאות סגורות, בחר הכל.' : 'קריאות נפתחות באפליקציה.'}
                </EmptyState>
              ) : (
                <div ref={scroller} className="queue-scroll">
                  {bookings.isError ? <ErrorNotice error={bookings.error} onRetry={() => void fetchNextPage()} /> : null}
                  <div className="tickets">
                    {rows.map((row) => (
                      <div key={row.uuid} className="ticket" style={{ cursor: 'default' }}>
                        <DomainBadge bookingTypeId={row.booking_type?.id} />
                        <div>
                          <div className="t1">
                            {row.booking_type?.display_name} <span className="serial">{row.serial_number}</span>
                          </div>
                          <div className="t2">
                            <span>נפתחה {row.created_at}</span>
                            {row.updated_at && row.updated_at !== row.created_at ? <span>· עודכנה {row.updated_at}</span> : null}
                          </div>
                        </div>
                        <div className="side">
                          <StatusChip statusId={row.status?.id} label={row.status?.display_name ?? ''} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div ref={sentinel} />
                  {isFetchingNextPage ? (
                    <div className="card-body">
                      <Loading rows={2} />
                    </div>
                  ) : null}
                </div>
              )}
            </FadeIn>
          </section>
        </FadeIn>
      </main>
    </>
  );
}
