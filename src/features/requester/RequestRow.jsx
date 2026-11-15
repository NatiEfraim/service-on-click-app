'use client';

import { DomainBadge } from '@/components/booking/DomainBadge';
import { StatusChip } from '@/components/ui/Chips';
import { isHoldStatus } from '@/lib/booking-workflow';
import { domainColor, STAGE_SHORT } from '@/lib/labels';
import { DEFAULT_WARN_RATIO, targetHoursOr } from '@/lib/targets';
import { Celebration } from './Celebration';
import { daysSince, isRejectedRequest, requestRoute } from './requesterData';

/**
 * The "updated since your last visit" mark: a mint "עדכון חדש" pill that pops in and bobs now and then, with tiny
 * bubbles and sparkles rising out of the text and fading.
 */
const RISING = ['', '✦', '', '✧'];
function UpdateMark({ negative = false }) {
  // a negative update (the request was rejected or cancelled) shows in red; any other in green
  return (
    <span className={`rq-new${negative ? ' bad' : ''}`} data-tip={negative ? 'הקריאה נדחתה או בוטלה מאז שצפית בה' : 'יש עדכון בקריאה מאז שצפית בה'} aria-hidden="true">
      עדכון חדש
      <span className="fx">
        {RISING.map((glyph, index) => <i key={index} className={glyph ? 'spark' : 'bub'}>{glyph}</i>)}
      </span>
    </span>
  );
}

/** The request's route as a row of dots, the same as the management list's (MiniRoute): passed, here, on hold, stopped, finished. */
function MiniSteps({ route }) {
  const { stations, here, mode } = route;
  const current = { here: 'h', hold: 'hold', stopped: 'stop', finished: 'fin' }[mode];
  return (
    <span className="mr" aria-hidden="true">
      {stations.map((station, index) => <i key={station.id} className={index < here ? 'd' : index === here ? current : ''} />)}
    </span>
  );
}

/** "3 ימ׳ / סה״כ" as the management list's hours: days at this step, days since opening, and a bar against the handling target. */
function AgeDays({ updatedAt, createdAt }) {
  const inStep = daysSince(updatedAt || createdAt);
  const total = daysSince(createdAt);
  // the screen's default handling target (48h) in days, as the management list measures a domain without its own
  const targetDays = targetHoursOr(null) / 24;
  const ratio = total === null ? null : Math.min(1, total / targetDays);
  const tone = ratio === null ? '' : ratio >= 1 ? 'over' : ratio >= DEFAULT_WARN_RATIO ? 'late' : ratio >= 0.5 ? 'near' : '';
  const days = (value) => (value === null ? '—' : `${value} ימ׳`);
  return (
    <span className={`age ${tone}`.trim()} data-tip="ימים בשלב הנוכחי וימים מאז שהקריאה נפתחה. הפס: הזמן הכולל מול יעד הטיפול">
      <span className="age-columns">
        <span className="age-cell">
          <span className="v">{days(inStep)}</span>
          <span className="cap">בשלב</span>
        </span>
        <span className="age-cell">
          <span className="small muted">{days(total)}</span>
          <span className="cap">סה״כ</span>
        </span>
      </span>
      {ratio !== null ? (
        <span className="bar">
          <span style={{ width: `${Math.max(4, ratio * 100)}%` }} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * One of the user's requests in a list, laid out like the management list's row (minus the decisions): the domain's
 * picture and colour, the domain and number (a hold notice beside them), then the opening day, the progress dots and the
 * status; at the end the days at this step and in total, or the status once closed. Also: the "עדכון חדש" mark, the
 * one-time celebration of a completion, and the "open in the side panel" look.
 */
export function RequestRow({ row, img, changed, selected, celebrating, onOpen, onCelebrated }) {
  const route = requestRoute(row.statusId, row.bookingTypeId);
  const closed = route.stage === 'closed';
  return (
    <button
      type="button"
      className={`rq-row rq-ticket${changed ? ' changed' : ''}${selected ? ' selected' : ''}`}
      style={{ '--dc': domainColor(row.bookingTypeId) }}
      aria-current={selected ? 'true' : undefined}
      onClick={onOpen}
      aria-label={`פרטי קריאה ${row.serial}, ${row.typeName}, ${row.statusName}${changed ? ', עודכנה מאז הביקור האחרון' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img ? <span className="dom"><img src={img} alt="" /></span> : <DomainBadge bookingTypeId={row.bookingTypeId} />}
      <span className="rq-ticket-main">
        <span className="t1">
          {row.typeName} <span className="serial">{row.serial}</span>
          {isHoldStatus(row.statusId) ? <StatusChip statusId={row.statusId} label={row.statusName} /> : null}
        </span>
        <span className="t2">
          <span>נפתחה {row.createdAt}</span>
          <span>·</span>
          <MiniSteps route={route} />
          {/* as the management list: the stage it waits at, or its closing status */}
          <span>{closed ? row.statusName : STAGE_SHORT[route.stage]}</span>
        </span>
      </span>
      <span className="rq-ticket-side">
        {changed ? <UpdateMark negative={route.mode === 'stopped'} /> : null}
        {closed ? <StatusChip statusId={row.statusId} label={row.statusName} /> : <AgeDays updatedAt={row.updatedAt} createdAt={row.createdAt} />}
      </span>
      {/* status changed since the last visit: the whole row glows green once, with light confetti */}
      {celebrating ? <Celebration key={celebrating} variant="row" rejected={isRejectedRequest(row.statusId)} onDone={onCelebrated} /> : null}
    </button>
  );
}
