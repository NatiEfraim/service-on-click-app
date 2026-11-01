'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorNotice, Loading } from '@/components/ui/Feedback';
import { TargetDialog } from '@/features/targets/TargetDialog';
import { insightsApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { fmtLongHours } from '@/lib/format';
import { useSession } from '@/providers/SessionProvider';

/** Handling target (opening to closing), edited with the dashboard's dialog. */
export function TargetTab({ bookingTypeId }: { bookingTypeId: number }) {
  const { me, can } = useSession();
  const [editing, setEditing] = useState(false);

  // targets are listed for admins only; others are pointed to the dashboard
  const canSee = can('targets.manage');
  const canEdit = canSee && (me.is_super_admin || me.permissions.includes(`admin_${bookingTypeId}`));
  const query = useQuery({ queryKey: keys.targets, queryFn: ({ signal }) => insightsApi.targets(signal), enabled: canSee, staleTime: 60_000 });

  if (!canSee) {
    return (
      <div className="st-panel-body">
        <p style={{ margin: 0 }}>יעד הטיפול של התחום מוגדר על ידי מפקד המחנה או מנהל המערכת.</p>
        {can('dashboard.view') ? (
          <p style={{ margin: 0 }}>
            <Link href={`/dashboard?types=${bookingTypeId}`}>לדשבורד התחום, שבו מוצג היעד והחריגות ממנו</Link>
          </p>
        ) : null}
      </div>
    );
  }
  if (query.isPending) return <div className="st-panel-body"><Loading rows={2} /></div>;
  if (query.isError) return <div className="st-panel-body"><ErrorNotice error={query.error} onRetry={() => void query.refetch()} /></div>;

  const target = query.data.find((item) => item.booking_type_id === bookingTypeId) ?? null;
  const text = target ? fmtLongHours(target.target_hours) : 'לא הוגדר';

  return (
    <div className="st-panel-body">
      <div className="setting" style={{ padding: 0, border: 0 }}>
        <div className="what">
          <b>יעד טיפול לתחום: {text}</b>
          <span>
            הזמן שבו קריאה בתחום צריכה להיסגר, מרגע פתיחתה. קריאה שעוברת אותו מסומנת כחורגת
            {target ? `, והתראה מוקדמת מופיעה ב-${Math.round((target.warn_ratio ?? 0.8) * 100)}% מהיעד` : ''}.
          </span>
        </div>
        {canEdit ? (
          <Button variant="primary" icon="edit" onClick={() => setEditing(true)}>
            {target ? 'עריכת היעד' : 'הגדרת יעד'}
          </Button>
        ) : (
          <span className="small muted">הגדרת היעד שמורה למנהל מערכת ולמפקד המחנה של התחום</span>
        )}
      </div>
      {editing ? <TargetDialog bookingTypeId={bookingTypeId} current={target} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
