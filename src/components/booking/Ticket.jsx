'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Chip, NeedsDecision, StatusChip } from '@/components/ui/Chips';
import { Icon } from '@/components/ui/Icon';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';

import { actionTone, domainColor, STAGE_SHORT } from '@/lib/labels';
import { DRAWER_EXIT_MS, EASE_DRAWER, prefersReducedMotion, ROW_STAMP_MS } from '@/lib/motion';
import { usePresence } from '@/components/ui/usePresence';
import { useSession } from '@/providers/SessionProvider';
import { bookingActions } from '@/lib/booking-actions';
import { isHoldStatus } from '@/lib/booking-workflow';
import { DomainBadge } from './DomainBadge';
import { AgeBar, MiniRoute } from './RouteViz';
import { useLeave, useArrive } from './ticketMotion';
import { topicBooking, topicHandlerName } from '@/lib/topicTypes';
import { useWindowMeasure } from '@/components/ui/useWindowMeasure';

/** Measures the selected row against the drawer's resting edge. */
function useCoveredBox(ref, selected) {
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    if (!selected) setBox(null);
  }, [selected]);
  // followed frame by frame while the drawer slides in (320ms), then on resize / scroll / the row's own size
  useWindowMeasure(Boolean(selected), () => {
    const row = ref.current;
    const drawer = document.querySelector('.drawer[role="dialog"]');
    const bounds = row?.getBoundingClientRect();
    const width = drawer ? document.documentElement.clientWidth - drawer.offsetWidth : 0;
    const page = row?.closest('.page');
    const left = page ? page.getBoundingClientRect().left + parseFloat(getComputedStyle(page).paddingLeft) : 12;
    const previewWidth = width - left;
    const next = bounds && previewWidth > 36
      ? { drawer, top: bounds.top, height: bounds.height, width: previewWidth, gap: width - bounds.right }
      : null;
    // a new object only when something moved, so a still row never re-renders
    setBox((previous) => (next === previous || (
      next && previous && next.drawer === previous.drawer && next.top === previous.top
      && next.height === previous.height && next.width === previous.width && next.gap === previous.gap
    ) ? previous : next));
  }, [ref, selected], { followMs: 320, observe: ref });
  return selected ? box : null;
}

/** One booking in a list, with the decisions available right now; `entering` marks a row that just arrived in the list. */
export function Ticket({ booking: given, showActions = true, onAction, outcome, entering = false }) {
  // ביטחון מידע / תקשוב named by their one handler, wherever the booking came from (the dashboard's oldest too)
  const booking = topicBooking(given);
  const { catalog, me, unitName } = useSession();
  const drawer = useBookingDrawer();
  const ref = useRef(null);
  useLeave(ref, outcome);
  useArrive(ref, entering);
  const actions = bookingActions(booking.actions);
  const owner = booking.owner_name || booking.owner_personal_id || '—';
  const open = () => drawer.open(booking.uuid ?? booking.serial_number);
  // the booking open in the side panel: its row stands out above the panel's dimming (the same look as the requester's list)
  const selected = drawer.matches(booking) && !outcome;
  // when the side panel closes, the row keeps its lifted look until the panel and its dimming are gone (DRAWER_EXIT_MS),
  // and only then settles into the list: dropped at once, the dimming would cover it (dark) and it would shrink under it.
  // Not when stepping to another booking (the panel stays) nor when the booking leaves after a decision (its own motion)
  const lingering = usePresence(selected, DRAWER_EXIT_MS);
  const lifted = selected || (lingering.closing && !outcome && drawer.key == null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  }, [selected]);
  // under the panel (a list on the right of the page): a compact copy beside the panel stands in for the row
  const covered = useCoveredBox(ref, selected);
  const previewRef = useRef(null);
  const drawerElement = covered?.drawer;
  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!drawerElement || !preview || prefersReducedMotion()) return;

    const slide = drawerElement.getAnimations().find((animation) => animation.animationName === 'slide');
    const inset = Math.min(preview.offsetWidth / 2, Number(preview.dataset.revealInset));
    // Counter the drawer's slide so the preview expands in place, starting at the original row.
    const expansion = preview.animate([
      { transform: "translateX(-" + (slide ? drawerElement.offsetWidth : 0) + "px)", clipPath: "inset(8px " + inset + "px 8px 0 round 14px)" },
      { transform: 'translateX(0)', clipPath: 'inset(0 round 14px 0 0 14px)' },
    ], { duration: slide?.effect.getTiming().duration ?? 240, easing: EASE_DRAWER });
    if (slide?.startTime != null) expansion.startTime = slide.startTime;
    return () => expansion.cancel();
  }, [drawerElement]);

  const identity = (preview) => (
    <>
      <DomainBadge bookingTypeId={booking.booking_type_id} />
      <div className="ticket-summary">
        <div className="t1">
          {preview ? (
            <span>{owner} <span className="serial">{booking.serial_number}</span></span>
          ) : (
            <button
              type="button"
              className="ticket-open"
              aria-label={`פתיחת קריאה ${booking.serial_number}, ${owner}, ${booking.booking_type_label}, ${booking.status_label}`}
              onClick={open}
            >
              {owner} <span className="serial">{booking.serial_number}</span>
            </button>
          )}
          {booking.attachments_count > 0 ? (
            <span className="clip" data-tip={`${booking.attachments_count} קבצים מצורפים`}>
              <Icon name="clip" />
              {booking.attachments_count}
            </span>
          ) : null}
          {booking.has_conflict || booking.sync_state === 'conflict' ? <NeedsDecision /> : null}
          {isHoldStatus(booking.status_id) ? <StatusChip statusId={booking.status_id} label={booking.status_label} bookingTypeId={booking.booking_type_id} /> : null}
          {booking.sync_state === 'pending' ? <Chip tone="info">ממתינה לשליחה</Chip> : null}
        </div>
        <div className="t2">
          <span>{booking.booking_type_label}</span>
          {me.is_super_admin && booking.unit_id ? <span>· {unitName(booking.unit_id)}</span> : null}
          <span>·</span>
          <MiniRoute booking={booking} catalog={catalog} />
          <span>{booking.stage === 'closed' ? booking.status_label : (booking.stage !== 'realization' && topicHandlerName(booking.booking_type_id)) || STAGE_SHORT[booking.stage]}</span>
        </div>
      </div>
    </>
  );
  const side = (
    <div className={`side${showActions && onAction ? ' with-actions' : ''}${booking.stage === 'closed' ? ' closed-status' : ''}`}>
      {booking.stage === 'closed' ? <StatusChip statusId={booking.status_id} label={booking.status_label} bookingTypeId={booking.booking_type_id} /> : <AgeBar booking={booking} />}
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
  );

  // Card click is for mouse users; the heading is the real button (role="button" would hide inner buttons).
  return (
    <>
      <div
        ref={ref}
        className={`ticket${outcome ? ` leaving ${outcome}` : ''}${lifted ? ' selected' : ''}${covered ? ' covered' : ''}`}
        aria-current={selected ? 'true' : undefined}
        aria-hidden={outcome || covered ? true : undefined}
        inert={covered ? true : undefined}
        style={{ '--dc': domainColor(booking.booking_type_id), '--stamp-ms': `${ROW_STAMP_MS}ms` }}
        onClick={(event) => {
          if ((event.target).closest('button, a')) return;
          open();
        }}
      >
        {identity(false)}
        {side}
        {outcome ? (
          <span className="ticket-stamp">
            <Icon name={outcome === 'ok' ? 'check' : 'x'} />
          </span>
        ) : null}
      </div>
      {covered ? createPortal(
        <div
          ref={previewRef}
          data-reveal-inset={Math.max(32, covered.gap)}
          className={`ticket ticket-copy${covered.width < 500 ? ' compact' : ''}`}
          style={{
            '--row-top': `${covered.top}px`,
            '--row-height': `${covered.height}px`,
            '--preview-width': `${covered.width}px`,
          }}
        >
          {identity(true)}
          {covered.width >= 500 ? side : null}
        </div>,
        covered.drawer,
      ) : null}
    </>
  );
}
