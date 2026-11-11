'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ExpandRow } from '@/components/ui/ExpandRow';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { Select } from '@/components/ui/Select';
import { fmtDateTime } from '@/lib/format';
import { sourceTag } from '@/lib/labels';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useSession } from '@/providers/SessionProvider';
import { ACTION_GROUPS, actionLabel, changedFields, fieldLabel, listChange, mergeOneSave, RESULT } from './labels';
import { VerifyButton } from './VerifyButton';
import { AuditTarget } from './AuditTarget';
import { usePresence } from '@/components/ui/usePresence';
import { usePublishDrawerList } from '@/features/bookings/drawerList';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { DRAWER_EXIT_MS } from '@/lib/motion';
import { useShowValue, useAuditPages } from './useAuditData';
import { AuditPeople } from './AuditPeople';

/** The table never gets shorter than this when the window is small. */
const MIN_TABLE_HEIGHT = 320;

const EMPTY = { q: '', action: '', type: '', result: '', from: '', to: '' };

/**
 * The history row whose eye opened the booking's side panel, brought forward: a copy of the row above the panel's
 * dimming, joined to the panel's edge, with all its columns fitted into the part of the page the panel leaves (the row
 * itself runs on under the panel). It floats in toward the panel as the panel slides in and back out as it slides away.
 */
function AuditRowPreview({ rowId, cells, closing }) {
  const [box, setBox] = useState(null);
  // while it leaves it keeps its last place, whatever the page does, so it never vanishes mid-way
  const closingRef = useRef(closing);
  useEffect(() => {
    closingRef.current = closing;
  });
  useLayoutEffect(() => {
    const measure = () => {
      const tr = document.querySelector(`tr[data-audit-row="${rowId}"]`);
      const scroller = tr?.closest('.audit-scroll');
      if (!tr || !scroller) return closingRef.current ? undefined : setBox(null);
      const bounds = tr.getBoundingClientRect();
      const view = scroller.getBoundingClientRect();
      const headerBottom = scroller.querySelector('thead')?.getBoundingClientRect().bottom ?? view.top;
      // out of the table's view: no copy (the row itself is not visible either)
      if (bounds.top < headerBottom || bounds.bottom > view.bottom) return closingRef.current ? undefined : setBox(null);
      const widths = Array.from(tr.cells, (cell) => cell.getBoundingClientRect().width);
      const next = {
        '--row-top': `${bounds.top}px`,
        '--row-left': `${bounds.left}px`,
        '--row-height': `${bounds.height}px`,
        // the row's own proportions, squeezed into the room the panel leaves
        '--row-columns': widths.map((width) => `minmax(0, ${width}fr)`).join(' '),
      };
      // a new object only when something moved, so a still row never re-renders (and never restarts anything)
      setBox((previous) => (previous && Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next));
    };
    measure();
    // the panel's arrival can shift the page a frame or two later: follow the row for the length of the opening
    let frame = 0;
    const started = performance.now();
    const follow = () => {
      measure();
      if (performance.now() - started < 450) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [rowId]);
  if (!box) return null;
  return createPortal(
    <div className="audit-row-preview" data-closing={closing || undefined} style={box} dir="rtl" aria-hidden="true">
      {cells.map((cell, index) => <span key={index}>{cell}</span>)}
    </div>,
    document.body,
  );
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
  // the row whose eye opened the booking's side panel: it stands out above the panel's dimming, as in "קריאות". The same
  // booking can be on several rows, so it is the row that was clicked (else the first row of that booking, e.g. a link)
  const drawer = useBookingDrawer();
  const [peekId, setPeekId] = useState(null);
  const peekRowId = drawer.serial
    ? (rows.find((row) => row.id === peekId && Number(row.booking_serial) === drawer.serial) ?? rows.find((row) => Number(row.booking_serial) === drawer.serial))?.id ?? null
    : null;
  // it stays up while the panel slides out, so it fades back with the panel instead of dropping under the dimming at once
  const peek = usePresence(peekRowId !== null, DRAWER_EXIT_MS);
  const [lastPeek, setLastPeek] = useState(null);
  if (peekRowId !== null && peekRowId !== lastPeek) setLastPeek(peekRowId);
  const peekedId = peekRowId ?? (peek.mounted ? lastPeek : null);
  // the side panel steps through the bookings of this list ("‹ 3 מתוך 12 ›", ↑ / ↓): each booking once, in the table's order
  // at the last loaded one, "next" first loads the table's next page (as in "קריאות")
  usePublishDrawerList([...new Set(rows.map((row) => Number(row.booking_serial)).filter(Boolean))], { hasMore: query.hasNextPage, loadMore: query.fetchNextPage });
  /** One history row's cells: when, who, action, what (a booking with its eye), source, result. */
  const rowCells = (row) => {
    const result = RESULT[row.result] ?? { label: row.result, tone: '' };
    const source = sourceTag(row.source);
    return [
      fmtDateTime(row.occurred_at),
      row.actor_type === 'system' ? 'המערכת' : row.actor_name ?? '—',
      actionLabel(row.action),
      <AuditTarget key="target" row={row} onPeek={setPeekId} />,
      source ? <span className={`tag ${source.tone}`}>{source.label}</span> : '—',
      <span key="result" className={`chip ${result.tone}`}>{result.label}</span>,
    ];
  };
  const peekedRow = peekedId === null ? null : rows.find((row) => row.id === peekedId) ?? null;
  // stepping to another booking (‹ › or ↑ ↓): the previous copy plays its exit while the next one comes in, so the two
  // cross-fade instead of one vanishing at once
  const [shownPeekId, setShownPeekId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  if (peekedId !== shownPeekId) {
    if (shownPeekId !== null && peekedId !== null) setLeavingId(shownPeekId);
    setShownPeekId(peekedId);
  }
  useEffect(() => {
    if (leavingId === null) return undefined;
    const timer = window.setTimeout(() => setLeavingId(null), DRAWER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leavingId]);
  const leavingRow = leavingId === null || leavingId === peekedId ? null : rows.find((row) => row.id === leavingId) ?? null;
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
          {leavingRow ? <AuditRowPreview key={leavingRow.id} rowId={leavingRow.id} cells={rowCells(leavingRow)} closing /> : null}
          {peekedRow ? <AuditRowPreview key={peekedRow.id} rowId={peekedRow.id} cells={rowCells(peekedRow)} closing={peek.closing} /> : null}
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
                  const changes = changedFields(row.before, row.after);
                  return (
                    <Fragment key={row.id}>
                      <tr data-audit-row={row.id} className={`clk${isOpen ? ' audit-open' : ''}${peekedId === row.id ? ' audit-row-peek' : ''}`} data-closing={peekedId === row.id && peek.closing ? true : undefined} aria-expanded={isOpen} tabIndex={0} onClick={() => setOpen(isOpen ? null : row.id)} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), setOpen(isOpen ? null : row.id))}>
                        {rowCells(row).map((cell, index) => <td key={index} style={index === 0 ? { whiteSpace: 'nowrap' } : undefined}>{cell}</td>)}
                      </tr>
                      <ExpandRow open={isOpen} colSpan={6}>
                        <div className="audit-detail-body">
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
                        </div>
                      </ExpandRow>
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
