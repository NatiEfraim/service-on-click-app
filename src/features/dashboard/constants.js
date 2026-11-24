import { STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { hasOwnRoute, ROUTE_STAGE_ORDER, routeStages } from '@/lib/routeTypes';
import { topicHandlerName } from '@/lib/topicTypes';

/** Every stage a chart may show, in reading order: the topics' one handler, the approval route, the routes' own steps (the clearance grant's, the service desk's). */
export const CHART_STAGE_ORDER = ['topic_handler', ...STAGE_ORDER, ...ROUTE_STAGE_ORDER];

export function chartStageLabel(stage, bookingTypeId) {
  return stage === 'topic_handler' ? topicHandlerName(bookingTypeId) ?? STAGE_SHORT.topic_handler : STAGE_SHORT[stage];
}

export function chartStageCounts(bookingTypeId, stages) {
  if (!topicHandlerName(bookingTypeId)) return stages;
  const { vice_approver = 0, approver = 0, ...remaining } = stages;
  return { ...remaining, topic_handler: vice_approver + approver };
}

/** How a stage's severity is shown in the bottleneck table. */
export const SEVERITY = {
  critical: { label: 'חריגה', tone: 'bad' },
  warning: { label: 'קרוב ליעד', tone: 'warn' },
  ok: { label: 'תקין', tone: 'ok' },
  no_target: { label: 'ללא יעד', tone: '' },
};

/** The longest window the API serves (DashboardService caps days at 365). */
export const ALL_WINDOW_DAYS = 365;

/** The dashboard's time windows, in days. */
export const WINDOWS = [
  { value: '7', label: 'שבוע' },
  { value: '30', label: '30 ימים' },
  { value: '90', label: 'רבעון' },
  // "all": the API's longest window (it caps days at 365), which holds every booking the system has today
  { value: String(ALL_WINDOW_DAYS), label: 'הכל' },
];

export const DEFAULT_WINDOW_DAYS = 30;

/** Stages where a booking waits for someone's decision (the clearance grant: its assignment and the step after the interview; the service desk: its queue). */
export const APPROVAL_STAGES = ['control_officer', 'vice_approver', 'approver', 'barber', 'interview_assignment', 'interviewed', 'service_desk_queue'];

/** The cards of the stage pipeline, in route order; each is shown only for types that reach its statuses. */
export const PIPELINE_STAGES = ['control_officer', 'vice_approver', 'approver', 'barber', 'supplier_approval', 'supplier_number', 'realization', ...ROUTE_STAGE_ORDER];

/**
 * The statuses that put a type on each card (14 / 17 / 18 control officer, 8 / 9 / 10 supplier holds, 11 / 12 the barber,
 * 101-104 the clearance grant's steps, 1 / 151 the service desk's queue and handling - on the route types only).
 */
const STAGE_STATUSES = {
  control_officer: [14, 17, 18],
  vice_approver: [15, 16],
  approver: [3, 4],
  barber: [11, 12],
  supplier_approval: [8, 9],
  supplier_number: [10],
  realization: [5, 7],
  interview_assignment: [101],
  interview_scheduled: [102],
  interviewed: [103],
  awaiting_clearance: [104],
  service_desk_queue: [1],
  service_desk_handling: [151],
};

/**
 * The pipeline cards of these types, from `catalog.booking_type_statuses`; every card when the catalog does not know
 * them. A type with a route of its own gets its steps only: its refusal (4) is no card of the approval route, and its
 * sent request (1) no card of the vice approver.
 */
export function pipelineStagesFor(bookingTypeIds, catalog) {
  const reachableOf = (ids) => ids.flatMap((id) => catalog?.booking_type_statuses?.[String(id)] ?? []);
  const generic = reachableOf(bookingTypeIds.filter((id) => !hasOwnRoute(id, catalog)));
  const route = reachableOf(bookingTypeIds.filter((id) => hasOwnRoute(id, catalog)));
  if (generic.length === 0 && route.length === 0) return PIPELINE_STAGES;
  return PIPELINE_STAGES.filter((stage) => STAGE_STATUSES[stage].some((status) => (ROUTE_STAGE_ORDER.includes(stage) ? route : generic).includes(status)));
}

/** Short side stages are counted inside the pipeline card next to them, when they have no card of their own. */
export const FOLDED_INTO = { supplier_files: 'supplier_approval' };

/** Rows shown in each bottleneck table. */
export const BOTTLENECK_ROWS = 8;

/** Headline tile colours. */
export const STAT_COLOR = { open: '#3D314A', awaiting: '#2E7470', overdue: '#B4423A', stale: '#B08A3E' };

/**
 * The stage columns of one domain's chart, in route order: the stages of its workflow (the barber has only "barber";
 * "supplier_files" goes with the supplier stages; a type with a route of its own has its steps), plus any other stage
 * that still holds open bookings.
 */
export function workflowColumns(bookingTypeId, catalog, stages, order) {
  if (hasOwnRoute(bookingTypeId, catalog)) {
    const own = routeStages(bookingTypeId, catalog);
    return order.filter((id) => own.includes(id) || (stages[id] ?? 0) > 0);
  }
  const workflow = bookingTypeId == null ? order : pipelineStagesFor([bookingTypeId], catalog);
  if (topicHandlerName(bookingTypeId)) {
    return order.filter((id) => id === 'topic_handler' || id === 'realization' || (stages[id] ?? 0) > 0);
  }
  return order.filter((id) => workflow.includes(id) || (id === 'supplier_files' && workflow.includes('supplier_approval')) || (stages[id] ?? 0) > 0);
}
