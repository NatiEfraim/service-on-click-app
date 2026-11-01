'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Ticket } from '@/components/booking/Ticket';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { useStatusAction } from '@/features/bookings/useStatusAction';
import { bookingsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { BookingRow, StageId } from '@/lib/api/types';
import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';

const PARAMS = { mine: true, open_only: true, per_page: 100, sort: 'stage_age_hours', dir: 'desc' } as const;

/** The bookings that wait for this user right now (`mine=1`), longest-waiting first, grouped by the stage they sit in. */
export function QueueScreen() {
  const { me, canAct } = useSession();
  const [stage, setStage] = useState<StageId | ''>('');
  const action = useStatusAction();
  const query = useQuery({ queryKey: keys.bookingList(PARAMS), queryFn: ({ signal }) => bookingsApi.list(PARAMS, signal) });

  const title = me.is_handler_only ? 'הקריאות שלי לטיפול' : 'ממתין לטיפולי';
  const rows: BookingRow[] = query.data?.data ?? [];
  const overdue = rows.filter((row) => row.overdue).length;

  const byStage = new Map<StageId, BookingRow[]>();
  for (const row of rows) byStage.set(row.stage, [...(byStage.get(row.stage) ?? []), row]);
  const stages = STAGE_ORDER.filter((id) => byStage.has(id));
  const active = stage && byStage.has(stage) ? stage : '';
  const shown = active ? (byStage.get(active) ?? []) : rows;

  return (
    <div className="narrow">
      <PageHead
        title={title}
        sub={
          query.isSuccess
            ? rows.length
              ? `${query.data.meta.total} קריאות נמצאות עכשיו בשלב שלך${overdue ? `. ${overdue} מהן חורגות מיעד הטיפול של התחום` : ''}.`
              : 'אין כרגע קריאות שממתינות לטיפול שלך.'
            : undefined
        }
      />
      <section className="card">
        {query.isPending ? (
          <div className="card-body">
            <Loading rows={6} />
          </div>
        ) : query.isError ? (
          <div className="card-body">
            <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={canAct ? 'אין משימות פתוחות' : 'אין לך תפקיד מאשר'}>
            {canAct ? 'קריאה חדשה שתגיע לשלב שבאחריותך תופיע כאן.' : 'בתפקידך את/ה צופה בקריאות. אישור ודחייה מתבצעים ע"י בעל התפקיד שהתור שלו במסלול.'}
          </EmptyState>
        ) : (
          <>
            <div className="toolbar">
              <div className="seg" role="group" aria-label="שלב">
                <button type="button" aria-pressed={!active} onClick={() => setStage('')}>
                  הכל<span className="c">{rows.length}</span>
                </button>
                {stages.map((id) => (
                  <button key={id} type="button" aria-pressed={active === id} onClick={() => setStage(id)}>
                    {STAGE_SHORT[id]}
                    <span className="c">{byStage.get(id)?.length}</span>
                  </button>
                ))}
              </div>
              <span className="grow" />
              <span className="small muted">ממוין לפי זמן ההמתנה בשלב</span>
            </div>
            <div className="tickets">
              {shown.map((row) => (
                <Ticket key={row.serial_number} booking={row} onAction={action.start} />
              ))}
            </div>
            {query.data.meta.total > rows.length ? (
              <div className="pager">
                <span>מוצגות {rows.length} מתוך {query.data.meta.total} הקריאות. לרשימה המלאה יש לעבור למסך &quot;קריאות&quot;.</span>
              </div>
            ) : null}
          </>
        )}
      </section>
      {action.dialog}
    </div>
  );
}
