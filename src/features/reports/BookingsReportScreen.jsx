'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { Select } from '@/components/ui/Select';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { useRowPreview } from '@/components/booking/useRowPreview';
import { ClearFilters } from '@/components/ui/ClearFilters';
import { ApiError } from '@/lib/api/client';
import { bookingsReportApi } from '@/lib/api/endpoints';
import { fmtDateTime } from '@/lib/format';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useSession } from '@/providers/SessionProvider';
import { usePublishDrawerList } from '@/features/bookings/drawerList';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { downloadBlob } from '@/lib/export/download';

const PER_PAGE = 25;
/** The table never gets shorter than this when the window is small. */
const MIN_TABLE_HEIGHT = 320;
const EMPTY = { booking_type_id: '', status_id: '', from_created_at: '', to_created_at: '' };

/** What an export failure means, in the words the guide asks for. */
function exportMessage(error) {
  if (!(error instanceof ApiError)) return 'ההורדה נכשלה. נסו שוב.';
  if (error.status === 503) return 'שמירת הדוח בגיבוי באחסון הקבצים נכשלה, ולכן הקובץ לא נשלח. נסו שוב בעוד כמה דקות.';
  if (error.status === 403) return 'אין לך הרשאה לייצא את הדוח.';
  if (error.status === 422) return 'אחד הסינונים אינו תקין. בדקו את התאריכים ונסו שוב.';
  return error.message || 'ההורדה נכשלה. נסו שוב.';
}


/** Bookings report: filter, preview page by page, and export every matching row to Excel (the same filters). */
export function BookingsReportScreen() {
  const { catalog } = useSession();
  const drawer = useBookingDrawer();
  // the row whose booking is open in the side panel pops out and joins the panel (as in the history and "קריאות")
  const preview = useRowPreview(drawer.serial);
  const [filters, setFilters] = useState(EMPTY);
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));

  // only the filters that are set go to the server; pages load as the table scrolls
  const sent = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
  const query = useInfiniteQuery({
    queryKey: ['reports', 'bookings', sent],
    queryFn: ({ pageParam, signal }) => bookingsReportApi.list({ ...sent, page: pageParam, per_page: PER_PAGE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: (previous) => previous,
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const meta = query.data?.pages[0]?.meta;
  // the drawer steps through these rows (‹ › and ↑ ↓), in this order
  usePublishDrawerList(rows.map((row) => row.serial_number), { total: meta?.total ?? null, hasMore: Boolean(query.hasNextPage), loadMore: () => void query.fetchNextPage() });

  // the card ends at the window's bottom and only the table scrolls inside it
  const card = useRef(null);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  useFitToWindow(card, MIN_TABLE_HEIGHT);
  const { isFetchingNextPage } = query;
  useInfiniteScroll({ sentinel, scroller, query, ahead: 400, remountKey: rows.length });

  const exporting = useMutation({
    mutationFn: () => bookingsReportApi.exportExcel(sent),
    onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
  });

  const filtered = Object.keys(sent).length > 0;
  const invalid = query.error instanceof ApiError && query.error.invalid;

  return (
    <div>
      <PageHead title={'דו"ח קריאות'} hideTitle />
      {exporting.isError ? (
        <Notice tone="bad" style={{ marginBottom: 14 }}>
          {exportMessage(exporting.error)}
        </Notice>
      ) : null}

      <section ref={card} className="card fit-card">
        <div className="toolbar">
          <Select autoWidth value={filters.booking_type_id} aria-label="תחום" onChange={(event) => update({ booking_type_id: event.target.value })}>
            <option value="">כל התחומים</option>
            {catalog.booking_types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.display_name}
              </option>
            ))}
          </Select>
          <Select autoWidth value={filters.status_id} aria-label="סטטוס" onChange={(event) => update({ status_id: event.target.value })}>
            <option value="">כל הסטטוסים</option>
            {catalog.statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.display_name}
              </option>
            ))}
          </Select>
          <DateRangePicker
            label="נוצרה"
            value={{ from: filters.from_created_at, to: filters.to_created_at }}
            onChange={(range) => update({ from_created_at: range.from, to_created_at: range.to })}
          />
          {filtered ? (
            <ClearFilters onClick={() => update(EMPTY)} />
          ) : null}
          {/* the export sits with the filters it applies: the count of what will be exported, then the button */}
          <span className="report-export">
            {meta ? <span className="hint">{meta.total} קריאות</span> : null}
            <Button size="sm" variant="primary" icon="download" loading={exporting.isPending} disabled={!meta || meta.total === 0} onClick={() => exporting.mutate()}>
              {exporting.isPending ? 'מכין את הקובץ...' : 'ייצוא לאקסל'}
            </Button>
          </span>
        </div>

        {query.isPending ? (
          <div className="card-body"><Loading rows={8} /></div>
        ) : query.isError && !query.data ? (
          <div className="card-body">
            {invalid ? <Notice tone="bad">{query.error.message}</Notice> : <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />}
          </div>
        ) : rows.length === 0 ? (
          <div className="card-body"><EmptyState title={filtered ? 'אין קריאות שמתאימות לסינון.' : 'אין קריאות להצגה.'} /></div>
        ) : (
          <div className={`fit-fill${query.isPlaceholderData ? ' is-stale' : ''}`}>
            {preview.node}
            <div ref={scroller} className="queue-scroll audit-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th>מספר קריאה</th>
                    <th>תחום</th>
                    <th>סטטוס</th>
                    <th>שם המבקש</th>
                    <th style={{ textAlign: 'center' }}>מספר אישי</th>
                    <th>יחידה</th>
                    <th>נוצרה</th>
                    <th>סטטוס עודכן</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.uuid ?? row.serial_number} {...preview.rowAttrs(Number(row.serial_number))} className={`clk${preview.rowClass(Number(row.serial_number))}`} tabIndex={0} onClick={() => drawer.open(row.serial_number)} onKeyDown={(event) => event.key === 'Enter' && drawer.open(row.serial_number)}>
                      <td><b>{row.serial_number}</b></td>
                      <td>{row.booking_type_label}</td>
                      <td>{row.status_label}</td>
                      <td>{row.owner_name ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}><span className="ltr">{row.owner_personal_number ?? '—'}</span></td>
                      <td>{row.unit_name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.created_at ? fmtDateTime(row.created_at) : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.status_changed_at ? fmtDateTime(row.status_changed_at) : '—'}</td>
                    </tr>
                  ))}
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
