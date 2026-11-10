'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Chip } from '@/components/ui/Chips';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { SideNav } from '@/components/ui/SideNav';
import { BookingLink } from '@/features/sync/BookingLink';
import { settingsApi } from '@/lib/api/endpoints';
import { statusTone } from '@/lib/labels';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { fmtDay } from './dates';

/** A list from the server, whether it comes as the array itself or wrapped in `data`. */
const asList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []);

const todayIso = () => new Date().toLocaleDateString('sv-SE');

const columns = [
  { id: 'time', header: 'שעה', sortValue: (row) => row.start_time, cell: (row) => <span className="ltr">{row.start_time}–{row.end_time}</span> },
  { id: 'name', header: 'שם', sortValue: (row) => row.user?.name ?? '', cell: (row) => row.user?.name ?? '—' },
  { id: 'personal', header: 'מספר אישי', sortValue: (row) => row.user?.personal_id ?? '', cell: (row) => <span className="ltr">{row.user?.personal_id ?? '—'}</span> },
  { id: 'phone', header: 'טלפון', cell: (row) => <span className="ltr">{row.user?.phone ?? '—'}</span> },
  {
    id: 'status',
    header: 'מצב',
    sortValue: (row) => row.booking?.status?.display_name ?? '',
    cell: (row) => (row.booking?.status ? <Chip tone={statusTone(row.booking.status.id)}>{row.booking.status.display_name}</Chip> : '—'),
  },
  { id: 'serial', header: 'קריאה', sortValue: (row) => row.booking?.serial_number ?? null, cell: (row) => <BookingLink serial={row.booking?.serial_number} /> },
];

/** The barber's service days and each day's appointments, as the mobile app shows them. View only: days and appointments are managed in the app. */
export function BarberDaysTab() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();

  const daysQuery = useQuery({ queryKey: ['barber', 'days'], queryFn: ({ signal }) => settingsApi.barberDays(signal), staleTime: 30_000 });
  const days = asList(daysQuery.data);
  const wanted = search.get('day');
  const current = days.find((day) => day.date === wanted) ?? days.find((day) => day.date === todayIso()) ?? days[0];

  const dayQuery = useQuery({
    queryKey: ['barber', 'day', current?.date],
    queryFn: ({ signal }) => settingsApi.barberDayBookings(current.date, signal),
    enabled: Boolean(current),
    staleTime: 30_000,
  });
  const bookings = asList(dayQuery.data);

  if (daysQuery.isPending) return <div className="st-panel-body"><Loading rows={6} /></div>;
  if (daysQuery.isError) return <div className="st-panel-body"><ErrorNotice error={daysQuery.error} title="לא ניתן להציג את ימי המספרה." onRetry={() => void daysQuery.refetch()} /></div>;
  if (!current) return <EmptyState title="אין ימי שירות קרובים">ימי השירות נקבעים לפי שעות הפעילות שהוגדרו לתחום.</EmptyState>;

  const items = days.map((day) => ({ id: day.date, label: `${day.day_name ?? ''} ${fmtDay(day.date)}`.trim(), meta: `${day.taken ?? 0} תורים` }));

  return (
    <div className="st-opt-split">
      <SideNav className="st-opt-nav" label="ימי שירות" items={items} currentId={current.date} onSelect={(date) => setParams({ day: date })} />
      <div key={current.date} className="st-opt-main st-opt-fade">
        <div className="st-opt-head">
          <div className="st-opt-title">
            <h3>{`${current.day_name ?? ''} ${fmtDay(current.date)}`.trim()}</h3>
            <span className="small muted">{current.taken ?? 0} תורים</span>
          </div>
          <span className="small muted">
            {current.service_hours ? <>שעות פעילות <span className="ltr">{current.service_hours.start_time}–{current.service_hours.end_time}</span></> : null}
            {current.break_hour ? <> · הפסקה <span className="ltr">{current.break_hour.start_time}–{current.break_hour.end_time}</span></> : null}
            {current.haircut_time ? <> · תספורת {current.haircut_time} דק׳</> : null}
          </span>
        </div>
        <div className="st-panel-body">
          <Notice>לצפייה בלבד. ניהול התורים והימים נעשה באפליקציה.</Notice>
        </div>
        {dayQuery.isPending ? (
          <div className="st-panel-body"><Loading rows={4} /></div>
        ) : dayQuery.isError ? (
          <div className="st-panel-body"><ErrorNotice error={dayQuery.error} title="לא ניתן להציג את התורים." onRetry={() => void dayQuery.refetch()} /></div>
        ) : (
          <DataTable label={`תורים ${fmtDay(current.date)}`} columns={columns} rows={bookings} rowKey={(row) => row.id} empty={<EmptyState title="אין תורים ביום זה" />} />
        )}
      </div>
    </div>
  );
}
