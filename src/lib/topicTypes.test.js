import { describe, expect, it } from 'vitest';
import { routeFor, routePosition } from '@/features/bookings/route';
import { topicBooking, topicHandlerName, topicStatusLabel } from './topicTypes';

describe('topic handler and status names', () => {
  it('names the one handler of each topic, and none for other domains', () => {
    expect(topicHandlerName(15)).toBe('קצין ביטחון מידע');
    expect(topicHandlerName(22)).toBe('מנהל תקשוב');
    expect(topicHandlerName(1)).toBeNull();
  });
  it('names statuses by the handler, not a technical factor', () => {
    expect(topicStatusLabel(4, 14)).toBe('נדחתה ע"י קצין ביטחון מידע');
    expect(topicStatusLabel(15, 20)).toBe('בטיפול מנהל תקשוב');
    expect(topicStatusLabel(1, 20)).toBe('הקריאה נשלחה');
    expect(topicStatusLabel(4, 1)).toBeNull();
    expect(topicStatusLabel(99, 20)).toBeNull();
  });
});

describe('topic route', () => {
  it('is received, the handler, realization, closed', () => {
    expect(routeFor({ booking_type_id: 18, stage: 'vice_approver' }).map((station) => station.label)).toEqual(['התקבלה', 'מנהל תקשוב', 'מימוש', 'סגירה']);
  });
  it('puts every open stage at the handler, and a closed one at the end', () => {
    for (const stage of ['vice_approver', 'approver', 'supplier_files']) {
      const booking = { booking_type_id: 14, stage, status_id: 15 };
      expect(routePosition(booking, routeFor(booking)).here).toBe(1);
    }
    const approved = { booking_type_id: 14, stage: 'realization', status_id: 3 };
    expect(routePosition(approved, routeFor(approved)).here).toBe(2);
    const closed = { booking_type_id: 14, stage: 'closed', status_id: 5 };
    expect(routePosition(closed, routeFor(closed))).toEqual({ here: 3, mode: 'finished' });
  });
  it('leaves the other domains on the approval route', () => {
    expect(routeFor({ booking_type_id: 1, stage: 'vice_approver' }).map((station) => station.id)).toContain('approver');
  });
});

describe('topicBooking', () => {
  it('names a topic booking by its handler: status, stage, actions and history', () => {
    const booking = topicBooking({
      booking_type_id: 15, status_id: 1, stage: 'vice_approver', status_label: 'ההזמנה נשלחה', stage_label: 'ממתין לגורם מטפל',
      actions: [{ status_id: 15, label: 'אישור והעברה למפקד התחום' }, { status_id: 4, label: 'דחייה' }],
      history: [{ status_id: 7, status_label: 'בוטל ע"י גורם טכני' }],
    });
    expect(booking.status_label).toBe('הקריאה נשלחה');
    expect(booking.stage_label).toBe('בטיפול קצין ביטחון מידע');
    expect(booking.actions.map((action) => action.label)).toEqual(['העברה לאישור סופי', 'דחייה סופית']);
    expect(booking.history[0].status_label).toBe('בוטלה ע"י קצין ביטחון מידע');
    expect(topicBooking(booking)).toBe(booking);
  });
  it('leaves any other booking as it is', () => {
    const other = { booking_type_id: 1, status_label: 'x' };
    expect(topicBooking(other)).toBe(other);
  });
});
