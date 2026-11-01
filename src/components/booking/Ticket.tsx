'use client';

import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, StatusChip } from '@/components/ui/Chips';
import { Icon } from '@/components/ui/Icon';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import type { BookingAction, BookingRow } from '@/lib/api/types';
import { actionTone, domainColor, STAGE_SHORT } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { DomainBadge } from './DomainBadge';
import { AgeBar, MiniRoute } from './RouteViz';

interface TicketProps {
  booking: BookingRow;
  /** Show the decision buttons the server offers (`actions`). Off for read-only lists. */
  showActions?: boolean;
  onAction?: (booking: BookingRow, action: BookingAction) => void;
}

/** One booking in a list: who, what, where on the route, how long, and the decisions available right now. */
export function Ticket({ booking, showActions = true, onAction }: TicketProps) {
  const { catalog, me, unitName } = useSession();
  const drawer = useBookingDrawer();
  const owner = booking.owner_name || booking.owner_personal_id || '—';
  const open = () => drawer.open(booking.serial_number);

  // The card is clickable for mouse users; keyboard and screen-reader users get a real button (the heading) - a `role="button"`
  // container would hide the decision buttons inside it from assistive technology.
  return (
    <div
      className="ticket"
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
    </div>
  );
}
