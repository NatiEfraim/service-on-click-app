'use client';

import { Chip } from '@/components/ui/Chips';
import { Notice } from '@/components/ui/Feedback';
import { fmtDay, normalizeDays } from './dates';
import { isDatesReference } from './refs';

/** Blocked dates are displayed here; changes are made in the mobile app. */
export function DatesTab({ settings }) {
  const reference = settings.system_references.find(isDatesReference);
  const days = normalizeDays((reference?.value.dates ?? []).filter((day) => typeof day === 'string'));

  return (
    <div className="st-panel-body">
      <Notice>תאריכים חסומים ניתן להוסיף דרך אפליקציית המובייל. כאן מוצגים התאריכים החסומים לצפייה בלבד.</Notice>
      <div className="st-days" role="list" aria-label="תאריכים חסומים">
        {days.length ? days.map((day) => (
          <span key={day} role="listitem" className="st-day">
            <Chip tone="acc">{fmtDay(day)}</Chip>
          </span>
        )) : <span className="muted">אין תאריכים חסומים</span>}
      </div>
    </div>
  );
}