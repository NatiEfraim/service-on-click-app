'use client';

import { useQuery } from '@tanstack/react-query';
import { ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { syncApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { BookingLink } from './BookingLink';

/** The bookings one file carried (loaded when the row opens). */
export function FileRecords({ file }) {
  const query = useQuery({ queryKey: keys.syncFile(file.id), queryFn: ({ signal }) => syncApi.file(file.id, signal), staleTime: 60_000 });
  return (
    <div className="audit-detail-body">
      <p className="hint ltr" style={{ textAlign: 'start' }}>{file.file_name}</p>
      {file.last_error ? <Notice tone="bad">{file.last_error}</Notice> : null}
      {query.isPending ? (
        <Loading rows={2} />
      ) : query.isError ? (
        <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.records.length === 0 ? (
        <p className="hint">אין רשומות בקובץ.</p>
      ) : (
        <div className="sync-records">
          {query.data.records.map((record, i) => (
            <span key={i} className="chip">
              {record.serial_number ?? record.booking_serial ? <BookingLink serial={record.serial_number ?? record.booking_serial} /> : `#${i + 1}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
