'use client';

import { useMutation } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { PageHead } from '@/components/ui/PageHead';
import { ApiError } from '@/lib/api/client';
import { hatchApi } from '@/lib/api/endpoints';
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion';
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
  // the last answer stays on screen (dimmed) while the next press runs, so the card does not jump empty and back;
  // `seq` gives each answer its own key, so a new one fades in
  const [shown, setShown] = useState(null);
  const mutation = useMutation({
    mutationFn: () => run({ ...filters, ...(withForce ? { force: force ? 1 : 0 } : {}) }),
    onSuccess: (data) => setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, lines: read(data), failure: null })),
    onError: (error) => setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, lines: [], failure: error instanceof ApiError ? error.message : 'הפעולה נכשלה. נסו שוב.' })),
  });

  // each new answer: the area glides from the height it had (0 the first time) to the new one while the answer fades in
  const resultBox = useRef(null);
  const lastHeight = useRef(0);
  useLayoutEffect(() => {
    const box = resultBox.current;
    if (!box || !shown) return;
    const to = box.scrollHeight;
    const from = lastHeight.current;
    lastHeight.current = to;
    if (prefersReducedMotion()) return;
    // the same height (a repeated answer) needs no glide, but the new answer still fades in
    const glide = Math.abs(to - from) < 1 ? null : box.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }], { duration: 320, easing: EASE_OUT });
    const fade = box.firstElementChild?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 80, easing: EASE_OUT, fill: 'backwards' });
    return () => {
      glide?.cancel();
      fade?.cancel();
    };
  }, [shown]);

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
        {/* the card's height glides to fit the result instead of jumping */}
        <div ref={resultBox}>
          {shown ? (
            <div key={shown.seq} className="hatch-result" aria-live="polite" data-busy={mutation.isPending || undefined}>
              {shown.failure ? <Notice tone="bad">{shown.failure}</Notice> : null}
              {shown.lines.map((line, i) => (
                <Notice key={i} tone={NOTICE_TONE[line.tone]}>
                  {line.text}
                </Notice>
              ))}
            </div>
          ) : null}
        </div>
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
      <PageHead title="צוהר דיגיטלי" hideTitle />

      {/* sending on one side, importing on the other, each a column of compact cards, so the page fits the window */}
      <div className="hatch-cols">
      <section>
      <h2 className="hatch-section">שליחה לאפליקציה</h2>
      <div className="hatch-stack">
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
      </section>

      <section>
      <h2 className="hatch-section">קבלה מהאפליקציה</h2>
      <div className="hatch-stack">
        <HatchCard title="קובץ הזמנות" hint="ההזמנות שהמשתמשים שלחו באפליקציה" button="ייבא קובץ הזמנות" run={hatchApi.importBookingJson} read={(data) => importJsonLines(data)} />
        <HatchCard title="קובץ לוג פעולות" hint="יש לייבא את קובץ ההזמנות לפני ייבוא לוג הפעולות" button="ייבא קובץ לוג פעולות" run={hatchApi.importApplicationLogJson} read={(data) => importJsonLines(data, true)} />
        <HatchCard title="קבצים מצורפים" hint="קבצים ותמונות שכבר נמצאים בבאקט" button="ייבא קבצים מצורפים" run={hatchApi.importFiles} read={importFilesLines} withForce={false} />
      </div>
      </section>
      </div>
    </div>
  );
}
