'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/Chips';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';

/** Top-bar search by serial, personal / ID number or name. `/` focuses it. */
export function GlobalSearch() {
  const router = useRouter();
  const drawer = useBookingDrawer();
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  const results = useQuery({
    queryKey: keys.bookingSearch(query),
    queryFn: ({ signal }) => bookingsApi.list({ q: query, per_page: 6 }, signal),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (event.key === '/' && !target?.closest('input, textarea, select, [contenteditable]')) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    const onPointer = (event) => {
      if (wrap.current && !wrap.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  const showAll = (q) => {
    setOpen(false);
    router.push(`/requests?view=all&q=${encodeURIComponent(q)}`);
  };

  const pick = (serial) => {
    setOpen(false);
    setValue('');
    setQuery('');
    drawer.open(serial);
  };

  const rows = results.data?.data ?? [];
  const total = results.data?.meta.total ?? 0;

  return (
    <div className="search" ref={wrap} role="search">
      <Icon name="search" />
      <input
        ref={input}
        id="global-search"
        value={value}
        placeholder="חיפוש קריאה"
        aria-label="חיפוש קריאה לפי מספר קריאה, מספר אישי או שם"
        autoComplete="off"
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            input.current?.blur();
          }
          if (event.key === 'Enter' && value.trim()) showAll(value.trim());
        }}
      />
      {open && query.length >= 2 ? (
        <div className="search-results">
          {results.isPending ? (
            <div className="empty small">מחפש…</div>
          ) : rows.length === 0 ? (
            <div className="empty small">לא נמצאו קריאות</div>
          ) : (
            <>
              {rows.map((row) => (
                <button key={row.serial_number} type="button" onClick={() => pick(row.serial_number)}>
                  <DomainBadge bookingTypeId={row.booking_type_id} size="sm" />
                  <span style={{ flex: 1 }}>
                    <b>{row.owner_name || row.owner_personal_id}</b>
                    <br />
                    <span className="small muted">
                      {row.booking_type_label} · <span className="serial">{row.serial_number}</span>
                    </span>
                  </span>
                  <StatusChip statusId={row.status_id} label={row.status_label} />
                </button>
              ))}
              {total > rows.length ? (
                <button type="button" onClick={() => showAll(query)}>
                  <span className="small" style={{ color: 'var(--accent)' }}>
                    כל {total} התוצאות
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
