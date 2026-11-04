import { describe, expect, it } from 'vitest';
import { barberStatusTiles } from './barber-dashboard';
import { APPROVAL_STAGES, FOLDED_INTO, pipelineStagesFor } from './constants';
import { isBarberDecision } from '@/lib/booking-actions';
import { OPEN_STATUS_IDS, CLOSED_STATUS_IDS } from '@/lib/api/endpoints';

describe('new barber route', () => {
  it('keeps server tile names and order without treating the total as a tile', () => {
    const rows = [1, 6, 11, 12, 13].map((status_id) => ({ status_id, status_display_name: 'server label', count: 2 }));
    expect(barberStatusTiles({ dashboard: { ...rows, total_bookings: 10 } })).toEqual(rows);
    expect(barberStatusTiles(undefined)).toEqual([]);
  });
  it('counts waiting barber bookings in their own approval stage', () => {
    expect(APPROVAL_STAGES).toContain('barber');
    expect(FOLDED_INTO.barber).toBeUndefined();
    expect(pipelineStagesFor([5], { booking_type_statuses: { 5: [1, 6, 11, 12, 13] } })).toEqual(['barber']);
  });
  it('classifies an approved barber appointment as closed in the requester filter', () => {
    expect(OPEN_STATUS_IDS).not.toContain(11);
    expect(CLOSED_STATUS_IDS).toContain(11);
    expect(OPEN_STATUS_IDS).toContain(3);
  });
  it('updates only barber decisions in place, preserving other types animation behavior', () => {
    expect(isBarberDecision({ booking_type_id: 5 }, { status_id: 11 })).toBe(true);
    expect(isBarberDecision({ booking_type_id: 5 }, { status_id: 12 })).toBe(true);
    expect(isBarberDecision({ booking_type_id: 5 }, { status_id: 3 })).toBe(false);
    expect(isBarberDecision({ booking_type_id: 8 }, { status_id: 3 })).toBe(false);
  });
});
