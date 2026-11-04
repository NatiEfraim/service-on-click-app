'use client';

import { useMutation } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { PageHead } from '@/components/ui/PageHead';
import { ApiError } from '@/lib/api/client';
import { hatchApi } from '@/lib/api/endpoints';
import { useSession } from '@/providers/SessionProvider';
import { exportLines, importFilesLines, importJsonLines } from './results';

/** Line tones to notice tones: errors red, warnings yellow, the rest (results and soft notices) plain. */
const NOTICE_TONE = { bad: 'bad', warn: 'warn', ok: '', info: '' };

/**
 * One operation: its button, an optional force box and filters, and the last result (kept until the next press).
 * Each card has its own request, so pressing one never blocks the others.
 */
function HatchCard({ title, hint, button, run, read, withForce = true, children, filters = {} }) {
  const [force, setForce] = useState(false);
  const mutation = useMutation({ mutationFn: () => run({ ...filters, ...(withForce ? { force: force ? 1 : 0 } : {}) }) });
  const lines = mutation.isSuccess ? read(mutation.data) : null;
  const failure = mutation.isError ? (mutation.error instanceof ApiError ? mutation.error.message : 'הפעולה נכשלה. נסו שוב.') : null;

  return (
    <Card title={title} hint={hint}>
      <CardBody>
        <div className="hatch-form">
          {children}
          {withForce ? (
            <label className="check">
              <input type="checkbox" checked={force} disabled={mutation.isPending} onChange={(event) => setForce(event.target.checked)} />
              שליחה בכפייה
            </label>
          ) : null}
          <Button variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {button}
          </Button>
        </div>
        {lines || failure ? (
          <div className="hatch-result" aria-live="polite">
            {failure ? <Notice tone="bad">{failure}</Notice> : null}
            {(lines ?? []).map((line, i) => (
              <Notice key={i} tone={NOTICE_TONE[line.tone]}>
                {line.text}
              </Notice>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Super admin: runs the digital hatch's daily exports (r2b) and imports (b2r) now instead of waiting for the scheduler. */
export function HatchScreen() {
  const { catalog } = useSession();
  const [bookingTypeId, setBookingTypeId] = useState('');
  const [statusId, setStatusId] = useState('');
  const statusFilters = { ...(bookingTypeId ? { booking_type_id: Number(bookingTypeId) } : {}), ...(statusId ? { status_id: Number(statusId) } : {}) };

  return (
    <div>
      <PageHead title="צוהר דיגיטלי" sub="הפעלה ידנית של הייצוא והייבוא שהשרת מריץ אוטומטית מדי יום." />

      <h2 className="hatch-section">ייצוא לאפליקציה (r2b)</h2>
      <div className="grid hatch-grid">
        <HatchCard
          title="קובץ סטטוס הזמנות"
          hint="ההחלטות האחרונות שטרם אושרו על ידי האפליקציה"
          button="שלח קובץ סטטוס הזמנות"
          run={hatchApi.exportBookingStatus}
          read={(data) => exportLines(data, 'הזמנות', 'bookings')}
          filters={statusFilters}
        >
          <Field label="תחום">
            <Select value={bookingTypeId} onChange={(event) => setBookingTypeId(event.target.value)}>
              <option value="">כל התחומים</option>
              {catalog.booking_types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="סטטוס">
            <Select value={statusId} onChange={(event) => setStatusId(event.target.value)}>
              <option value="">כל הסטטוסים</option>
              {catalog.statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.display_name}
                </option>
              ))}
            </Select>
          </Field>
        </HatchCard>
        <HatchCard
          title="קובץ משתמשים"
          hint="אנשים שהתפקידים שלהם השתנו וטרם נשלחו"
          button="שלח קובץ משתמשים"
          run={hatchApi.exportUsers}
          read={(data) => exportLines(data, 'משתמשים', 'users')}
        />
      </div>

      <h2 className="hatch-section">ייבוא מהאפליקציה (b2r)</h2>
      <Notice>יש לייבא את קובץ ההזמנות לפני קובץ לוג הפעולות: לוג של הזמנה שעוד לא קיימת ימתין לה.</Notice>
      <div className="grid hatch-grid mt">
        <HatchCard title="קובץ הזמנות" hint="ההזמנות שהמשתמשים שלחו באפליקציה" button="ייבא קובץ הזמנות" run={hatchApi.importBookingJson} read={(data) => importJsonLines(data)} />
        <HatchCard title="קובץ לוג פעולות" hint="היסטוריית הסטטוסים של ההזמנות" button="ייבא קובץ לוג פעולות" run={hatchApi.importApplicationLogJson} read={(data) => importJsonLines(data, true)} />
        <HatchCard title="קבצים מצורפים" hint="קבצים ותמונות שכבר נמצאים בבאקט" button="ייבא קבצים מצורפים" run={hatchApi.importFiles} read={importFilesLines} withForce={false} />
      </div>
    </div>
  );
}
