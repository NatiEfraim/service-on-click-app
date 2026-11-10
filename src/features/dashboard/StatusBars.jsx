'use client';

import { EmptyState } from '@/components/ui/Feedback';
import { statusTone } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';

const TONE_COLOR = { ok: 'var(--ok)', bad: 'var(--bad)', hold: 'var(--hold)', acc: 'var(--accent)', warn: 'var(--warn)', info: 'var(--info)', '': 'var(--mute)' };

/** A bar per status with open bookings, most first, coloured like the status chip; a bar opens those bookings. */
export function StatusBars({ counts, onStatus }) {
  const { catalog } = useSession();
  const rows = Object.entries(counts)
    .map(([id, count]) => ({ id: Number(id), count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const widest = Math.max(1, ...rows.map((row) => row.count));

  if (rows.length === 0) return <EmptyState title="אין קריאות פתוחות" />;

  return (
    <div style={{ padding: '8px 0' }}>
      {rows.map((row) => {
        const name = catalog.statuses.find((status) => status.id === row.id)?.display_name ?? `סטטוס ${row.id}`;
        return (
          <div className="hbar" key={row.id}>
            <button type="button" className="lab" onClick={() => onStatus(row.id)}>
              {name}
            </button>
            <span className="track" style={{ width: `${Math.max(4, (row.count / widest) * 100)}%` }}>
              <button type="button" style={{ flex: 1, background: TONE_COLOR[statusTone(row.id)] }} aria-label={`${name}: ${row.count}`} onClick={() => onStatus(row.id)} />
            </span>
            <b className="num">{row.count}</b>
          </div>
        );
      })}
    </div>
  );
}
