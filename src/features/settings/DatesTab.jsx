'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { MultiDatePicker } from '@/components/ui/DateRangePicker';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Feedback';
import { settingsApi } from '@/lib/api/endpoints';
import { EASE_OUT, RESIZE_MS, prefersReducedMotion } from '@/lib/motion';
import { useSaveMutation } from '@/lib/useSaveMutation';
import { useConfirm } from '@/providers/UiProvider';
import { dayError, fmtDay, normalizeDays, sameDays } from './dates';
import { isDatesReference } from './refs';
import { useReloadSettings } from './useSettings';

export function DatesTab({ settings, unitId, bookingTypeId, ownUnit }) {
  const reference = settings.system_references.find(isDatesReference);
  return reference ? (
    <DateList key={reference.id} reference={reference} unitId={unitId} bookingTypeId={bookingTypeId} canEdit={ownUnit} />
  ) : <Notice>אין הגדרת תאריכים חסומים בתחום זה</Notice>;
}

function DateList({ reference, unitId, bookingTypeId, canEdit }) {
  const [draft, setDraft] = useState(null);
  const [picked, setPicked] = useState([]);
  const [leaving, setLeaving] = useState([]);
  const listRef = useRef(null);
  const previousPositions = useRef(null);
  const movements = useRef(new WeakMap());

  useLayoutEffect(() => {
    const positions = previousPositions.current;
    previousPositions.current = null;
    if (!positions) return;

    for (const [tag, before] of positions) {
      if (!tag.isConnected) continue;
      movements.current.get(tag)?.cancel();
      const after = tag.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (x || y) {
        movements.current.set(tag, tag.animate(
          [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }],
          { duration: RESIZE_MS, easing: EASE_OUT },
        ));
      }
    }
  }, [leaving]);

  function finishRemoval(day) {
    if (!prefersReducedMotion()) {
      const tags = Array.from(listRef.current.querySelectorAll('.st-day:not([data-closing])'));
      previousPositions.current = tags.map((tag) => [tag, tag.getBoundingClientRect()]);
    }
    setLeaving((current) => current.filter((value) => value !== day));
  }
  const days = normalizeDays((reference.value.dates ?? []).filter((day) => typeof day === 'string').map((day) => day.slice(0, 10)));
  const selected = draft ?? days;
  const visible = normalizeDays([...selected, ...leaving]);
  const pending = picked.filter((day) => !dayError(day, selected));
  const confirm = useConfirm();
  const reload = useReloadSettings(unitId, bookingTypeId);
  const save = useSaveMutation({
    mutationFn: async (dates) => {
      const { data: impact } = await settingsApi.restrictionImpact(reference.id, dates);
      if (impact.new_dates.length) {
        const ok = await confirm({
          title: 'חסימת תאריכים',
          body: impact.affected_count
            ? `חסימת התאריכים תבטל ${impact.affected_count} קריאות קיימות. לשמור את השינויים?`
            : 'התאריכים ייחסמו להזמנות חדשות. לשמור את השינויים?',
          confirmLabel: 'שמירת החסימה',
        });
        if (!ok) return false;
      }
      await settingsApi.saveSystemReferences(bookingTypeId, { [reference.id]: { dates } });
      return true;
    },
    success: (saved) => saved ? 'התאריכים החסומים עודכנו' : null,
    reload,
    onSaved: (saved) => { if (saved) setDraft(null); },
  });

  function add(event) {
    event.preventDefault();
    setDraft(normalizeDays([...selected, ...pending]));
    setPicked([]);
  }

  return (
    <div className="st-panel-body">
      <Notice>ניהול תאריכים חסומים מתבצע באתר. התאריכים שנשמרו מועברים לאפליקציה בסנכרון.</Notice>
      {canEdit && (
        <form className="st-days" onSubmit={add}>
          <MultiDatePicker label="תאריכים לחסימה" placeholder="בחירת תאריכים" value={pending} onChange={setPicked}
            isDateDisabled={(day) => save.isPending || Boolean(dayError(day, selected))} />
          <Button type="submit" disabled={!pending.length || save.isPending}>הוספת תאריכים</Button>
          <Button variant="primary" disabled={pending.length > 0 || sameDays(days, selected)} loading={save.isPending}
            onClick={() => save.mutate(selected)}>שמירת שינויים</Button>
        </form>
      )}
      <div ref={listRef} className="st-days" role="list" aria-label="תאריכים חסומים">
        {visible.length ? visible.map((day) => {
          const closing = !selected.includes(day);
          return (
            <span key={day} role="listitem" className="st-day" data-closing={closing || undefined}
              aria-hidden={closing || undefined}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && event.animationName === 'st-day-out') {
                  finishRemoval(day);
                }
              }}>
              <Chip tone="acc">{fmtDay(day)}</Chip>
              {canEdit && <button type="button" disabled={closing || save.isPending}
                aria-label={`הסרת חסימה ל-${fmtDay(day)}`}
                onClick={() => {
                  setLeaving((current) => [...current, day]);
                  setDraft((current) => (current ?? days).filter((value) => value !== day));
                }}><Icon name="x" /></button>}
            </span>
          );
        }) : <span className="muted st-days-empty">אין תאריכים חסומים</span>}
      </div>
    </div>
  );
}
