'use client';

import { useQuery } from '@tanstack/react-query';
import { Chip } from '@/components/ui/Chips';
import { Loading, Notice } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import { fmtDay, normalizeDays } from './dates';
import { isDatesReference } from './refs';

/** Blocked dates are displayed here; changes are made in the mobile app. */
/**
 * Domains whose blocked dates the mobile app reads from the live blocked-dates list (not the stored setting), by the
 * route name the app uses. The other domains (car maintenance, transportation) show the stored setting, as the app does.
 */
const LIVE_DATES_ROUTE = { 1: 'car-booking', 5: 'barber-booking', 10: 'out-unit-food-booking', 11: 'in-unit-food-booking' };

/** The blocked dates in the app's own answer for this reference; null when it is not there. */
function liveDates(answer, referenceId) {
  const reference = (answer?.system_refences ?? []).find((candidate) => Number(candidate.id) === Number(referenceId));
  const value = reference?.details?.find((detail) => detail.key === 'dates')?.value;
  return Array.isArray(value) ? value : null;
}

export function DatesTab({ settings, bookingTypeId }) {
  const reference = settings.system_references.find(isDatesReference);
  const route = LIVE_DATES_ROUTE[bookingTypeId];
  const live = useQuery({
    queryKey: ['settings', 'app-references', route],
    queryFn: ({ signal }) => settingsApi.appReferences(route, signal),
    enabled: Boolean(route && reference),
    staleTime: 60_000,
    retry: false,
  });
  // the app's live list when it has one; otherwise (another domain, or the request failed) the stored setting
  const fromApp = live.isSuccess ? liveDates(live.data, reference?.id) : null;
  const source = fromApp ?? reference?.value.dates ?? [];
  const days = normalizeDays(source.map((day) => (typeof day === 'string' ? day.slice(0, 10) : null)).filter(Boolean));

  if (route && reference && live.isPending) return <div className="st-panel-body"><Loading rows={2} /></div>;

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