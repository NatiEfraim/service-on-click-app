'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { ResolveConflictDialog } from '@/features/bookings/ResolveConflictDialog';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { ApiError } from '@/lib/api/client';
import { syncApi } from '@/lib/api/endpoints';
import { invalidateWork, keys } from '@/lib/api/keys';
import { fmtAgo, fmtDateTime } from '@/lib/format';
import { useToast } from '@/providers/UiProvider';

const KIND_LABEL = { booking_status: 'סטטוסים של קריאות', booking_values: 'תיקוני ערכים', system_config: 'הגדרות מערכת' };
const STATE = {
  queued: { label: 'ממתין לשליחה', tone: 'warn' },
  sent: { label: 'נשלח', tone: 'ok' },
  failed: { label: 'נכשל', tone: 'bad' },
  blocked: { label: 'נחסם', tone: 'bad' },
  superseded: { label: 'הוחלף בקובץ חדש', tone: '' },
  awaiting_external_support: { label: 'ממתין לתמיכה באפליקציה', tone: 'warn' },
};
const stateOf = (state) => STATE[state] ?? { label: state, tone: '' };

/** A link-looking booking number that opens the booking's side panel. */
function BookingLink({ serial }) {
  const drawer = useBookingDrawer();
  if (!serial) return '—';
  return (
    <button type="button" className="linkbtn" onClick={(event) => { event.stopPropagation(); drawer.open(serial); }}>
      {serial}
    </button>
  );
}

/** One headline number of the status strip. */
function Tile({ label, value, sub, tone = '' }) {
  return (
    <div className={`sync-tile ${tone}`}>
      <span className="sync-tile-label">{label}</span>
      <b>{value}</b>
      {sub ? <span className="hint">{sub}</span> : null}
    </div>
  );
}

/** Super admin: is the channel to the mobile app flowing, and if not, what is stuck and how to free it. */
export function SyncScreen() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: keys.sync, queryFn: ({ signal }) => syncApi.overview(signal), refetchInterval: 30_000 });
  const [openFile, setOpenFile] = useState(null);
  const [resolving, setResolving] = useState(null);

  const run = useMutation({
    mutationFn: () => syncApi.run(),
    onSuccess: async (result) => {
      const data = result?.data ?? result;
      toast(data?.busy ? 'שליחה כבר מתבצעת - נסו שוב עוד רגע.' : data?.enabled === false ? 'השליחה לאפליקציה כבויה בשרת.' : 'השליחה הופעלה.', data?.busy || data?.enabled === false ? 'bad' : 'ok');
      await invalidateWork(client);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'השליחה נכשלה.', 'bad'),
  });
  const retry = useMutation({
    mutationFn: (id) => syncApi.retry(id),
    onSuccess: async () => {
      toast('הקובץ נשלח שוב.', 'ok');
      await invalidateWork(client);
    },
    onError: async (e) => {
      toast(e instanceof ApiError ? e.message : 'השליחה החוזרת נכשלה.', 'bad');
      await invalidateWork(client);
    },
  });

  if (query.isPending) return <Loading rows={10} />;
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;

  const { health, files, conflicts, pending_decisions: pending, can_operate: canOperate } = query.data;
  const stuckFiles = files.filter((file) => file.state === 'failed' || file.state === 'blocked');
  const openConflicts = conflicts.filter((conflict) => conflict.state === 'open');
  const problems = stuckFiles.length + openConflicts.length;
  const overall = !health.export_enabled ? 'off' : problems ? 'bad' : health.pending_decisions > 0 ? 'warn' : 'ok';
  const OVERALL = {
    ok: 'הסנכרון תקין: כל ההחלטות נשלחו לאפליקציה.',
    warn: `יש ${health.pending_decisions} החלטות שממתינות לשליחה הבאה.`,
    bad: `יש ${problems} תקלות שדורשות טיפול.`,
    off: 'השליחה לאפליקציה כבויה בשרת.',
  };

  return (
    <div>
      <PageHead
        title="סנכרון עם האפליקציה"
        sub="מצב העברת ההחלטות מהמערכת לאפליקציה, ותקלות שדורשות טיפול."
        actions={
          <>
            <Link className="btn ghost" href="/manage/hatch">צוהר דיגיטלי</Link>
            {canOperate ? (
              <Button variant="primary" icon="sync" loading={run.isPending} onClick={() => run.mutate()}>
                סנכרן עכשיו
              </Button>
            ) : null}
          </>
        }
      />

      {/* 1. the status strip */}
      <section className="card sync-strip">
        <div className={`sync-light ${overall}`}>
          <span className="sync-dot" aria-hidden="true" />
          <b>{OVERALL[overall]}</b>
        </div>
        <div className="sync-tiles">
          <Tile label="שליחה אחרונה" value={health.last_sent_at ? fmtAgo(health.last_sent_at) : 'עדיין לא'} sub={health.last_sent_at ? fmtDateTime(health.last_sent_at) : null} />
          <Tile label="החלטות ממתינות" value={health.pending_decisions} tone={health.pending_decisions ? 'warn' : ''} />
          <Tile label="קבצים שנכשלו" value={health.failed_files + health.blocked_files} tone={health.failed_files + health.blocked_files ? 'bad' : ''} />
          <Tile label="התנגשויות פתוחות" value={health.open_conflicts} tone={health.open_conflicts ? 'bad' : ''} />
        </div>
      </section>

      {/* 2. what needs attention */}
      <Card title="דורש טיפול" spaced>
        {problems === 0 ? (
          <div className="card-body sync-clear">
            <Icon name="check" /> אין תקלות פתוחות.
          </div>
        ) : (
          <div className="card-body sync-problems">
            {openConflicts.map((conflict) => (
              <div key={`c${conflict.id}`} className="sync-problem">
                <span className="chip bad">התנגשות</span>
                <span>
                  קריאה <BookingLink serial={conflict.booking_serial} />
                  {conflict.booking_type_label ? ` · ${conflict.booking_type_label}` : ''}: כאן <b>{conflict.internal_label ?? conflict.internal_status_id}</b>, באפליקציה <b>{conflict.external_label ?? conflict.external_status_id}</b>
                  <span className="hint"> · {fmtDateTime(conflict.detected_at)}</span>
                </span>
                {canOperate ? (
                  <span className="sync-actions">
                    <Button size="sm" onClick={() => setResolving({ conflict, resolution: 'keep_internal' })}>השאר את ההחלטה כאן</Button>
                    <Button size="sm" onClick={() => setResolving({ conflict, resolution: 'accept_external' })}>קבל את האפליקציה</Button>
                  </span>
                ) : null}
              </div>
            ))}
            {stuckFiles.map((file) => (
              <div key={`f${file.id}`} className="sync-problem">
                <span className={`chip ${stateOf(file.state).tone}`}>{stateOf(file.state).label}</span>
                <span>
                  {KIND_LABEL[file.kind] ?? file.kind} · <span className="ltr">{file.file_name}</span>
                  {file.last_error ? <span className="hint"> · {file.last_error}</span> : null}
                  <span className="hint"> · {file.attempts} ניסיונות</span>
                </span>
                {canOperate ? (
                  <span className="sync-actions">
                    <Button size="sm" icon="sync" loading={retry.isPending && retry.variables === file.id} onClick={() => retry.mutate(file.id)}>נסה שוב</Button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid g-7-5 mt">
        {/* 3. the files sent */}
        <Card title="קבצים אחרונים" hint="לחיצה על קובץ מציגה את הקריאות שבו">
          {files.length === 0 ? (
            <div className="card-body"><EmptyState title="עדיין לא נשלחו קבצים." /></div>
          ) : (
            <div className="tbl-wrap sync-files">
              <table className="t">
                <thead>
                  <tr><th>מתי</th><th>סוג</th><th className="num">רשומות</th><th>מצב</th></tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const isOpen = openFile === file.id;
                    return (
                      <Fragment key={file.id}>
                        <tr className={`clk${isOpen ? ' audit-open' : ''}`} aria-expanded={isOpen} tabIndex={0} onClick={() => setOpenFile(isOpen ? null : file.id)} onKeyDown={(event) => event.key === 'Enter' && setOpenFile(isOpen ? null : file.id)}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(file.completed_at ?? file.created_at)}</td>
                          <td>{KIND_LABEL[file.kind] ?? file.kind}</td>
                          <td className="num">{file.record_count ?? '—'}</td>
                          <td><span className={`chip ${stateOf(file.state).tone}`}>{stateOf(file.state).label}</span></td>
                        </tr>
                        {isOpen ? (
                          <tr className="audit-detail">
                            <td colSpan={4}><FileRecords file={file} /></td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 4. decisions waiting for the next send */}
        <Card title="ממתינות לשליחה" hint="החלטות שהתקבלו כאן ועוד לא נשלחו לאפליקציה">
          {pending.length === 0 ? (
            <div className="card-body sync-clear"><Icon name="check" /> הכל נשלח.</div>
          ) : (
            <div className="tbl-wrap sync-files">
              <table className="t">
                <thead>
                  <tr><th>קריאה</th><th>החלטה</th><th>מתי</th></tr>
                </thead>
                <tbody>
                  {pending.map((row) => (
                    <tr key={row.booking_serial}>
                      <td><BookingLink serial={row.booking_serial} /></td>
                      <td>{row.status_label ?? row.status_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtAgo(row.decided_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {resolving ? (
        <ResolveConflictDialog
          // the dialog speaks about one booking; here it gets the conflict's two statuses
          booking={{ status_label: resolving.conflict.internal_label, sync: { open_conflict: resolving.conflict, ext_status_label: resolving.conflict.external_label } }}
          resolution={resolving.resolution}
          onClose={() => setResolving(null)}
        />
      ) : null}
    </div>
  );
}

/** The bookings one file carried (loaded when the row opens). */
function FileRecords({ file }) {
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
