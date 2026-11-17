'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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
import { useRowPreview } from '@/components/booking/useRowPreview';
import { ClearFilters } from '@/components/ui/ClearFilters';
import { usePublishDrawerList } from '@/features/bookings/drawerList';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { useShowValue, useAuditPages } from './useAuditData';
import { AuditPeople } from './AuditPeople';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';

/** The table never gets shorter than this when the window is small. */
const MIN_TABLE_HEIGHT = 320;

const EMPTY = { q: '', action: '', type: '', result: '', from: '', to: '' };

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
  // that row pops out and joins the panel; it fades back as the panel leaves, and cross-fades on ‹ › (useRowPreview)
  const preview = useRowPreview(peekRowId);
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
  const total = lists.reduce((sum, list) => sum + (list.data?.pages[0]?.meta.total ?? 0), 0);

  // the card ends at the window's bottom and only the table scrolls inside it
  const card = useRef(null);
  const scroller = useRef(null);
  useFitToWindow(card, MIN_TABLE_HEIGHT);

  // the next page loads as the bottom of the table scrolls into view
  const sentinel = useRef(null);
  const { isFetchingNextPage } = query;
  useInfiniteScroll({ sentinel, scroller, query, ahead: 400, remountKey: rows.length });

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
            <ClearFilters onClick={() => { setFilters(EMPTY); setSearchText(''); }} />
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
          {preview.node}
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
                      <tr {...preview.rowAttrs(row.id)} className={`clk${isOpen ? ' audit-open' : ''}${preview.rowClass(row.id)}`} aria-expanded={isOpen} tabIndex={0} onClick={() => setOpen(isOpen ? null : row.id)} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), setOpen(isOpen ? null : row.id))}>
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
