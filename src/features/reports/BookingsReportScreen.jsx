'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Controls';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { Select } from '@/components/ui/Select';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { ApiError } from '@/lib/api/client';
import { bookingsReportApi } from '@/lib/api/endpoints';
import { fmtDateTime } from '@/lib/format';
import { useSession } from '@/providers/SessionProvider';

const PER_PAGE = 25;
const EMPTY = { booking_type_id: '', status_id: '', from_created_at: '', to_created_at: '' };

/** What an export failure means, in the words the guide asks for. */
function exportMessage(error) {
  if (!(error instanceof ApiError)) return 'ההורדה נכשלה. נסו שוב.';
  if (error.status === 503) return 'שמירת הדוח בגיבוי באחסון הקבצים נכשלה, ולכן הקובץ לא נשלח. נסו שוב בעוד כמה דקות.';
  if (error.status === 403) return 'אין לך הרשאה לייצא את הדוח.';
  if (error.status === 422) return 'אחד הסינונים אינו תקין. בדקו את התאריכים ונסו שוב.';
  return error.message || 'ההורדה נכשלה. נסו שוב.';
}

/** Hands the browser the file to save. */
function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Bookings report: filter, preview page by page, and export every matching row to Excel (the same filters). */
export function BookingsReportScreen() {
  const { catalog } = useSession();
  const drawer = useBookingDrawer();
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const update = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  // only the filters that are set go to the server
  const sent = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
  const query = useQuery({
    queryKey: ['reports', 'bookings', sent, page],
    queryFn: ({ signal }) => bookingsReportApi.list({ ...sent, page, per_page: PER_PAGE }, signal),
    placeholderData: (previous) => previous,
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const exporting = useMutation({
    mutationFn: () => bookingsReportApi.exportExcel(sent),
    onSuccess: ({ blob, fileName }) => saveFile(blob, fileName),
  });

  const filtered = Object.keys(sent).length > 0;
  const invalid = query.error instanceof ApiError && query.error.invalid;

  return (
    <div>
      <PageHead
        title={'דו"ח קריאות'}
        sub="סינון הקריאות בתחומים שבאחריותך וייצוא לאקסל. הקובץ כולל את כל הקריאות שמתאימות לסינון, בדיוק כמו בטבלה."
        actions={
          <Button variant="primary" icon="download" loading={exporting.isPending} disabled={!meta || meta.total === 0} onClick={() => exporting.mutate()}>
            {exporting.isPending ? 'מכין את הקובץ...' : `ייצוא לאקסל${meta ? ` (${meta.total})` : ''}`}
          </Button>
        }
      />
      {exporting.isError ? (
        <Notice tone="bad" style={{ marginBottom: 14 }}>
          {exportMessage(exporting.error)}
        </Notice>
      ) : null}

      <section className="card">
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
            <Button size="sm" variant="ghost" icon="x" onClick={() => update(EMPTY)}>
              ניקוי
            </Button>
          ) : null}
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
          <div style={{ opacity: query.isPlaceholderData ? 0.55 : 1, transition: 'opacity 180ms ease' }}>
            <div className="tbl-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>מספר קריאה</th>
                    <th>תחום</th>
                    <th>סטטוס</th>
                    <th>שם המבקש</th>
                    <th>מספר אישי</th>
                    <th>יחידה</th>
                    <th>נוצרה</th>
                    <th>סטטוס עודכן</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.uuid ?? row.serial_number} className="clk" tabIndex={0} title="פרטי הקריאה" onClick={() => drawer.open(row.serial_number)} onKeyDown={(event) => event.key === 'Enter' && drawer.open(row.serial_number)}>
                      <td><b>{row.serial_number}</b></td>
                      <td>{row.booking_type_label}</td>
                      <td>{row.status_label}</td>
                      <td>{row.owner_name ?? '—'}</td>
                      <td className="ltr">{row.owner_personal_number ?? '—'}</td>
                      <td>{row.unit_name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.created_at ? fmtDateTime(row.created_at) : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.status_changed_at ? fmtDateTime(row.status_changed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta ? <Pager page={meta.page} lastPage={meta.last_page} total={meta.total} onPage={setPage} /> : null}
          </div>
        )}
      </section>
    </div>
  );
}
