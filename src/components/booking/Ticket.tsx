'use client';

import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, StatusChip } from '@/components/ui/Chips';
import { Icon } from '@/components/ui/Icon';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { actionTone, domainColor, STAGE_SHORT } from '@/lib/labels';
import { EASE_OUT, prefersReducedMotion, ROW_COLLAPSE_MS, ROW_SLIDE_MS, ROW_STAMP_MS } from '@/lib/motion';
import { useSession } from '@/providers/SessionProvider';
import { DomainBadge } from './DomainBadge';
import { AgeBar, MiniRoute } from './RouteViz';

interface TicketProps {
  booking: BookingRow;
  showActions?: boolean;
  onAction?: (booking: BookingRow, action: BookingAction) => void;
  /** Set once a decision on this row succeeded: stamp ✓ / ✗, slide out to the right, collapse. */
  outcome?: 'ok' | 'bad';
}

/** The leave sequence: stamp, slide out, collapse (timings in lib/motion). */
function useLeave(ref: RefObject<HTMLDivElement | null>, outcome: TicketProps['outcome']) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !outcome) return;
    const reduce = prefersReducedMotion();
    let cancelled = false;
    // approved leaves to the right, rejected / cancelled to the left
    const away = outcome === 'ok' ? '100%' : '-100%';
    const timer = window.setTimeout(async () => {
      const slide = el.animate(
        reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${away})` }],
        { duration: ROW_SLIDE_MS, easing: EASE_OUT, fill: 'forwards' },
      );
      await slide.finished;
      if (cancelled) return;
      // the rows below glide up into the freed space
      const style = getComputedStyle(el);
      el.style.overflow = 'hidden';
      el.animate(
        [
          { height: `${el.offsetHeight}px`, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, borderBottomWidth: style.borderBottomWidth },
          { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' },
        ],
        { duration: reduce ? 0 : ROW_COLLAPSE_MS, easing: EASE_OUT, fill: 'forwards' },
      );
    }, ROW_STAMP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ref, outcome]);
}

/** One booking in a list, with the decisions available right now. */
export function Ticket({ booking, showActions = true, onAction, outcome }: TicketProps) {
  const { catalog, me, unitName } = useSession();
  const drawer = useBookingDrawer();
  const ref = useRef<HTMLDivElement>(null);
  useLeave(ref, outcome);
  const owner = booking.owner_name || booking.owner_personal_id || '—';
  const open = () => drawer.open(booking.serial_number);

  // Card click is for mouse users; the heading is the real button (role="button" would hide inner buttons).
  return (
    <div
      ref={ref}
      className={`ticket${outcome ? ` leaving ${outcome}` : ''}`}
      aria-hidden={outcome ? true : undefined}
      style={{ '--dc': domainColor(booking.booking_type_id) } as CSSProperties}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return;
        open();
      }}
    >
      <DomainBadge bookingTypeId={booking.booking_type_id} />
      <div>
        <div className="t1">
          <button
            type="button"
            className="ticket-open"
            aria-label={`פתיחת קריאה ${booking.serial_number}, ${owner}, ${booking.booking_type_label}, ${booking.status_label}`}
            onClick={open}
          >
            {owner} <span className="serial">{booking.serial_number}</span>
          </button>
          {booking.attachments_count > 0 ? (
            <span className="clip" title={`${booking.attachments_count} קבצים מצורפים`}>
              <Icon name="clip" />
              {booking.attachments_count}
            </span>
          ) : null}
          {booking.has_conflict || booking.sync_state === 'conflict' ? <NeedsDecision /> : null}
          {booking.sync_state === 'pending' ? <Chip tone="info">ממתינה לשליחה</Chip> : null}
        </div>
        <div className="t2">
          <span>{booking.booking_type_label}</span>
          {me.is_super_admin && booking.unit_id ? <span>· {unitName(booking.unit_id)}</span> : null}
          <span>·</span>
          <MiniRoute booking={booking} catalog={catalog} />
          <span>{booking.stage === 'closed' ? booking.status_label : STAGE_SHORT[booking.stage]}</span>
        </div>
      </div>
      <div className="side">
        {booking.stage === 'closed' ? <StatusChip statusId={booking.status_id} label={booking.status_label} /> : <AgeBar booking={booking} />}
        {showActions && booking.actions.length > 0 && onAction ? (
          <div className="acts">
            {booking.actions.slice(0, 2).map((action) => {
              const tone = actionTone(action);
              return (
                <Button key={action.status_id} size="sm" variant={tone === 'danger' ? 'danger' : tone === 'hold' ? 'hold' : 'primary'} onClick={() => onAction(booking, action)}>
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
      {outcome ? (
        <span className="ticket-stamp">
          <Icon name={outcome === 'ok' ? 'check' : 'x'} />
        </span>
      ) : null}
    </div>
  );
}
