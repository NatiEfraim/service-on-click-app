import { describe, expect, it } from 'vitest';

import { STAGE_ORDER } from '@/lib/labels';
import { CHART_STAGE_ORDER, chartStageCounts, chartStageLabel, pipelineStagesFor, workflowColumns } from './constants';

const catalog = {
  booking_type_statuses: {
    '1': [1, 3, 4, 5, 6, 7, 15, 16],
    '5': [1, 6, 11, 12, 13],
    '8': [1, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18],
    '14': [4, 101, 102, 103, 104, 105],
    '20': [1, 5, 6, 7, 151],
  },
};

describe('workflowColumns', () => {
  // 15 and 16: the ביטחון מידע types with one handler (the clearance grant, 14, and the service desk have routes of their own - below)
  it.each([[15, 'קצין ביטחון מידע'], [16, 'קצין ביטחון מידע']])('merges both approval buckets for type %i', (type, handler) => {
    const stages = chartStageCounts(type, { vice_approver: 9, approver: 14, realization: 4 });
    expect(stages).toEqual({ topic_handler: 23, realization: 4 });
    expect(workflowColumns(type, catalog, stages, CHART_STAGE_ORDER)).toEqual(['topic_handler', 'realization']);
    expect(chartStageLabel('topic_handler', type)).toBe(handler);
  });


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

describe('the clearance grant (14): its own steps as stages', () => {
  it('gives its chart every step of the route, counts untouched, plus any other stage still holding bookings', () => {
    expect(chartStageCounts(14, { interview_scheduled: 2, awaiting_clearance: 1 })).toEqual({ interview_scheduled: 2, awaiting_clearance: 1 });
    expect(workflowColumns(14, catalog, { interview_scheduled: 2 }, CHART_STAGE_ORDER)).toEqual(['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance']);
    expect(workflowColumns(14, catalog, { vice_approver: 1 }, CHART_STAGE_ORDER)).toEqual(['vice_approver', 'interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance']);
    expect(chartStageLabel('interviewed', 14)).toBe('תוחקר');
  });

  it('puts its steps on the pipeline cards, and no card of the approval route', () => {
    expect(pipelineStagesFor([14], catalog)).toEqual(['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance']);
    expect(pipelineStagesFor([1], catalog)).toEqual(['vice_approver', 'approver', 'realization']);
  });
});

describe('the service desk (20-25): its queue and handling as stages', () => {
  it('gives its chart its two stages, counts untouched, plus any other stage still holding bookings', () => {
    expect(chartStageCounts(20, { service_desk_queue: 3, service_desk_handling: 1 })).toEqual({ service_desk_queue: 3, service_desk_handling: 1 });
    expect(workflowColumns(20, catalog, { service_desk_queue: 3 }, CHART_STAGE_ORDER)).toEqual(['service_desk_queue', 'service_desk_handling']);
    expect(workflowColumns(20, catalog, { vice_approver: 1 }, CHART_STAGE_ORDER)).toEqual(['vice_approver', 'service_desk_queue', 'service_desk_handling']);
    expect(chartStageLabel('service_desk_handling', 20)).toBe('בטיפול נציג מוקד');
  });

  it('puts its two stages on the pipeline cards: its sent request (1) is no card of the vice approver, and the clearance grant\'s steps are not its own', () => {
    expect(pipelineStagesFor([20], catalog)).toEqual(['service_desk_queue', 'service_desk_handling']);
    // the commander who sees a camp type and the desk: the approval route's cards for the camp type, the desk's for the desk
    expect(pipelineStagesFor([1, 20], catalog)).toEqual(['vice_approver', 'approver', 'realization', 'service_desk_queue', 'service_desk_handling']);
  });
});
