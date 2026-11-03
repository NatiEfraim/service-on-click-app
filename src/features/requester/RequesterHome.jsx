'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/Chips';
import { Seg } from '@/components/ui/Controls';
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
  const user = useQuery({ queryKey: ['requester', 'user'], queryFn: ({ signal }) => requesterApi.user(signal), retry: false });

  const bookings = useInfiniteQuery({
    queryKey: ['requester', 'bookings', view],
    queryFn: ({ pageParam, signal }) => requesterApi.myBookings(pageParam, view === 'open' ? OPEN_STATUS_IDS : null, signal),
    initialPageParam: 1,
    // the API wraps the page as {data: [...]} without paging meta: a full page means more may exist, a short one is the end
    getNextPageParam: (last, pages) => ((last.data?.length ?? 0) >= REQUESTER_PAGE_SIZE ? pages.length + 1 : undefined),
    enabled: user.isSuccess,
    placeholderData: (previous) => previous,
  });
  const rows = bookings.data?.pages.flatMap((page) => page.data ?? []) ?? [];
  const countLabel = `${rows.length}${bookings.hasNextPage ? '+' : ''} קריאות`;

  // the card ends at the window's bottom; the next 20 load as the bottom of the list scrolls into view
  const card = useRef(null);
  useFitToWindow(card);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = bookings;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
              <span className="grow" />
              {bookings.isSuccess ? <span className="small muted">{countLabel}</span> : null}
            </div>
            <FadeIn key={view} className="fit-fill" style={{ opacity: bookings.isPlaceholderData ? 0.55 : 1, transition: 'opacity .15s' }}>
              {bookings.isPending ? (
                <div className="card-body">
                  <Loading rows={6} />
                </div>
              ) : bookings.isError && !rows.length ? (
                <div className="card-body">
                  <ErrorNotice error={bookings.error} onRetry={() => void bookings.refetch()} />
                </div>
              ) : rows.length === 0 ? (
                <EmptyState title={view === 'open' ? 'אין לך קריאות פתוחות' : 'עדיין לא פתחת קריאות'}>קריאות נפתחות באפליקציה.</EmptyState>
              ) : (
                <div ref={scroller} className="queue-scroll">
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
