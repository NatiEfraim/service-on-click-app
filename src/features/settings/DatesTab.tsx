'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { settingsApi } from '@/lib/api/endpoints';
import { invalidateWork } from '@/lib/api/keys';
import type { RestrictionImpact, Settings } from '@/lib/api/types';
import { useConfirm, useToast } from '@/providers/UiProvider';
import { dayError, fmtDay, normalizeDays, sameDays } from './dates';
import { isDatesReference } from './refs';
import { handleWriteError, useReloadSettings } from './useSettings';

function ImpactBody({ impact, typeName }: { impact: RestrictionImpact; typeName: string }) {
  return (
    <div className="st-impact">
      <p>
        <b>
          החסימה תבטל {impact.affected_count} קריאות {typeName}
        </b>{' '}
        שנקבעו {impact.new_dates.length > 1 ? 'לתאריכים' : 'לתאריך'} {impact.new_dates.map(fmtDay).join(', ')}. הן יעברו לסטטוס &quot;{impact.cancel_status_label}&quot;, והשינוי יישלח גם לאפליקציה. לא ניתן לבטל פעולה זו.
      </p>
      <p className="small muted">רשימת התאריכים החסומים שייכת לתחום ולא ליחידה: החסימה חלה על התחום בכל היחידות.</p>
      {impact.affected_serials.length ? (
        <>
          <span className="small">הקריאות שיבוטלו{impact.affected_in_other_units ? ' (ביחידה זו)' : ''}:</span>
          <div className="st-serials">
            {impact.affected_serials.map((serial) => (
              <span key={serial} className="serial">
                {serial}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {impact.affected_in_other_units > 0 ? <p className="small">ועוד {impact.affected_in_other_units} קריאות ביחידות אחרות.</p> : null}
    </div>
  );
}

/** Blocked dates. Blocking cancels bookings, so changes are checked with `impact` first. */
export function DatesTab({ unitId, bookingTypeId, settings, ownUnit, ownUnitId, typeName }: { unitId: number; bookingTypeId: number; settings: Settings; ownUnit: boolean; ownUnitId: number | null; typeName: string }) {
  const client = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const reference = settings.system_references.find(isDatesReference);

  const saved = normalizeDays(((reference?.value.dates as string[] | undefined) ?? []).filter((day) => typeof day === 'string'));
  const [draft, setDraft] = useState<string[]>(saved);
  const [newDay, setNewDay] = useState('');
  const [error, setError] = useState('');

  // sync with the server list, adjusted during render
  const serverKey = saved.join(',');
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    setDraft(saved);
  }

  const save = useMutation({
    mutationFn: async (days: string[]) => {
      if (!reference) return { saved: false };
      const impact = (await settingsApi.restrictionImpact(reference.id, days)).data;
      if (impact.affected_count > 0) {
        const ok = await confirm({
          title: 'החסימה תבטל קריאות קיימות',
          body: <ImpactBody impact={impact} typeName={typeName} />,
          confirmLabel: `חסימה וביטול ${impact.affected_count} קריאות`,
          cancelLabel: 'חזרה',
          tone: 'danger',
        });
        if (!ok) return { saved: false };
      }
      await settingsApi.saveSystemReferences(bookingTypeId, { [reference.id]: { dates: days } });
      return { saved: true, cancelled: impact.affected_count };
    },
    onSuccess: async (result) => {
      if (!result.saved) return;
      toast(result.cancelled ? `התאריכים נשמרו. ${result.cancelled} קריאות בוטלו.` : 'התאריכים נשמרו ונרשמו בהיסטוריית השינויים.', 'ok');
      // cancelled bookings change counts everywhere
      await Promise.all([reload(), result.cancelled ? invalidateWork(client) : Promise.resolve()]);
    },
    onError: async (e) => {
      const shown = await handleWriteError(e, toast, reload);
      if (shown) setError(shown.message);
    },
  });

  if (!reference) return <EmptyState title="לתחום זה אין רשימת תאריכים חסומים" />;

  const dirty = !sameDays(draft, saved);

  function add() {
    const problem = dayError(newDay, draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setDraft(normalizeDays([...draft, newDay]));
    setNewDay('');
  }

  return (
    <div className="st-panel-body">
      {!ownUnit ? (
        <Notice>
          ניתן לערוך תאריכים חסומים דרך היחידה שלך בלבד. הרשימה משותפת לכל היחידות
          {ownUnitId !== null ? (
            <>
              {' '}
              -{' '}
              <Link href={`/manage/settings/${ownUnitId}/${bookingTypeId}?tab=dates`}>לעריכה בהגדרות היחידה שלך</Link>
            </>
          ) : null}
          .
        </Notice>
      ) : null}
      <p style={{ margin: 0 }}>
        בתאריך חסום לא ניתן להזמין. קריאות פעילות שכבר נקבעו לאותו תאריך מבוטלות, והחסימה חלה על התחום בכל היחידות. שישי ושבת חסומים ממילא.
      </p>
      <div className="st-days" role="list" aria-label="תאריכים חסומים">
        {draft.length ? (
          draft.map((day) => (
            <span key={day} role="listitem" className="st-day">
              <Chip tone="acc">
                {fmtDay(day)}
                {ownUnit ? (
                  <button type="button" aria-label={`הסרת ${fmtDay(day)}`} onClick={() => setDraft(draft.filter((other) => other !== day))}>
                    <Icon name="x" />
                  </button>
                ) : null}
              </Chip>
            </span>
          ))
        ) : (
          <span className="muted">אין תאריכים חסומים</span>
        )}
      </div>
      {ownUnit ? (
        <div className="st-add-row">
          <label className="field">
            <span>הוספת תאריך</span>
            <input
              className="input"
              type="date"
              value={newDay}
              onChange={(event) => {
                setNewDay(event.target.value);
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
            />
          </label>
          <Button onClick={add}>הוספה</Button>
          <span style={{ flex: 1 }} />
          <Button onClick={() => setDraft(saved)} disabled={!dirty || save.isPending}>
            ביטול שינויים
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => {
              setError('');
              save.mutate(draft);
            }}
          >
            שמירה
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
      {ownUnit && dirty ? <p className="small muted" style={{ margin: 0 }}>לפני השמירה תוצג ההשפעה על קריאות קיימות.</p> : null}
    </div>
  );
}
