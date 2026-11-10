'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, StatusChip } from '@/components/ui/Chips';
import { Icon } from '@/components/ui/Icon';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';

import { actionTone, domainColor, STAGE_SHORT } from '@/lib/labels';
import { ROW_STAMP_MS } from '@/lib/motion';
import { useSession } from '@/providers/SessionProvider';
import { bookingActions } from '@/lib/booking-actions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { DomainBadge } from './DomainBadge';
import { AgeBar, MiniRoute } from './RouteViz';
import { useLeave, useArrive } from './ticketMotion';

/** One booking in a list, with the decisions available right now; `entering` marks a row that just arrived in the list. */
export function Ticket({ booking, showActions = true, onAction, outcome, entering = false }) {
  const { catalog, me, unitName } = useSession();
  const drawer = useBookingDrawer();
  const ref = useRef(null);
  useLeave(ref, outcome);
  useArrive(ref, entering);
  const actions = bookingActions(booking.actions);
  const owner = booking.owner_name || booking.owner_personal_id || '—';
  const open = () => drawer.open(booking.serial_number);

  // Card click is for mouse users; the heading is the real button (role="button" would hide inner buttons).
  return (
    <div
      ref={ref}
      className={`ticket${outcome ? ` leaving ${outcome}` : ''}`}
      aria-hidden={outcome ? true : undefined}
      style={{ '--dc': domainColor(booking.booking_type_id), '--stamp-ms': `${ROW_STAMP_MS}ms` }}
      onClick={(event) => {
        if ((event.target).closest('button, a')) return;
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
            <span className="clip" data-tip={`${booking.attachments_count} קבצים מצורפים`}>
              <Icon name="clip" />
              {booking.attachments_count}
            </span>
          ) : null}
          {booking.has_conflict || booking.sync_state === 'conflict' ? <NeedsDecision /> : null}
          {isHoldStatus(booking.status_id) ? <StatusChip statusId={booking.status_id} label={booking.status_label} /> : null}
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
      <div className={`side${showActions && onAction ? ' with-actions' : ''}${booking.stage === 'closed' ? ' closed-status' : ''}`}>
        {booking.stage === 'closed' ? <StatusChip statusId={booking.status_id} label={booking.status_label} /> : <AgeBar booking={booking} />}
        {showActions && booking.actions.length > 0 && onAction ? (
          <div className="acts">
            {actions.slice(0, 2).map((action) => {
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
