import { describe, expect, it } from 'vitest';

import { STAGE_ORDER } from '@/lib/labels';
import { workflowColumns } from './constants';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 6, 11, 12, 13],
    '8': [1, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18],
  },
};

describe('workflowColumns', () => {
  it('gives the barber only its own stage', () => {
    expect(workflowColumns(5, catalog, { barber: 23 }, STAGE_ORDER)).toEqual(['barber']);
  });

  it('gives an ordinary domain its route, without the control officer or the suppliers', () => {
    expect(workflowColumns(1, catalog, {}, STAGE_ORDER)).toEqual(['vice_approver', 'approver', 'realization']);
  });

  it('gives shipments the control officer and the supplier stages', () => {
    expect(workflowColumns(8, catalog, {}, STAGE_ORDER)).toEqual(['control_officer', 'vice_approver', 'approver', 'supplier_files', 'supplier_approval', 'supplier_number', 'realization']);
  });

  it('keeps a stage outside the workflow while it still holds bookings', () => {
    expect(workflowColumns(5, catalog, { barber: 2, approver: 1 }, STAGE_ORDER)).toEqual(['approver', 'barber']);
  });
});
