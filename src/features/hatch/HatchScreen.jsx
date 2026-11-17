'use client';

import { Select } from '@/components/ui/Select';
import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { PageHead } from '@/components/ui/PageHead';
import { hatchApi } from '@/lib/api/endpoints';
import { useSession } from '@/providers/SessionProvider';
import { exportLines, importLines, importSucceeded } from './results';
import { HatchCard } from './HatchCard';

/**
 * Super admin: runs the digital hatch's daily exports (r2b) and imports (b2r) now instead of waiting for the scheduler
 * (the frontend guide of 2026-11-17). Each card chooses its channel - through the FTP or straight to the bucket - and
 * runs the same services as the scheduled commands, so a manual run never sends or fetches anything twice.
 */
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
          ftpOnlyFilters
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
        <HatchCard
          title="קובץ הגדרות מערכת"
          hint="רשומות ההגדרות שהשתנו כאן וטרם נשלחו"
          button="שלח קובץ הגדרות מערכת"
          run={hatchApi.exportSystemReferences}
          read={(data) => exportLines(data, 'הגדרות', 'records')}
        />
      </div>
      </section>

      <section>
      <h2 className="hatch-section">קבלה מהאפליקציה</h2>
      <div className="hatch-stack">
        {/* the order matters: bookings, then their attachments, then the action log (a log waits for its bookings) */}
        <HatchCard
          title="1. קובץ הזמנות"
          hint="ההזמנות שהמשתמשים שלחו באפליקציה"
          button="ייבא קובץ הזמנות"
          run={hatchApi.importBookingJson}
          read={importLines}
          forceLabel="לקיחה מחדש מה-FTP"
          next={(data) => (importSucceeded(data) ? { tone: 'info', text: 'השלב הבא: ייבוא הקבצים המצורפים, ואחריו ייבוא לוג הפעולות.' } : null)}
        />
        <HatchCard
          title="2. קבצים מצורפים"
          hint="קבצים ותמונות של ההזמנות"
          button="ייבא קבצים מצורפים"
          run={hatchApi.importFiles}
          read={importLines}
          forceLabel="לקיחה מחדש מה-FTP"
          next={(data) => (importSucceeded(data) ? { tone: 'info', text: 'השלב הבא: ייבוא לוג הפעולות.' } : null)}
        />
        <HatchCard
          title="3. קובץ לוג פעולות"
          hint="יש לייבא את קובץ ההזמנות לפני ייבוא לוג הפעולות"
          button="ייבא קובץ לוג פעולות"
          run={hatchApi.importApplicationLogJson}
          read={importLines}
          forceLabel="לקיחה מחדש מה-FTP"
        />
      </div>
      </section>
      </div>
    </div>
  );
}
