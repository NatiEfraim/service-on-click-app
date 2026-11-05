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

/** Stages where a booking waits for an approver's decision. */
export const APPROVAL_STAGES = ['control_officer', 'vice_approver', 'approver', 'barber'];

/** The cards of the stage pipeline, in route order; each is shown only for types that reach its statuses. */
export const PIPELINE_STAGES = ['control_officer', 'vice_approver', 'approver', 'barber', 'supplier_approval', 'supplier_number', 'realization'];

/** The statuses that put a type on each card (14 / 17 / 18 control officer, 8 / 9 / 10 supplier holds, 11 / 12 the barber). */
const STAGE_STATUSES = {
  control_officer: [14, 17, 18],
  vice_approver: [15, 16],
  approver: [3, 4],
  barber: [11, 12],
  supplier_approval: [8, 9],
  supplier_number: [10],
  realization: [5, 7],
};

/** The pipeline cards of these types, from `catalog.booking_type_statuses`; every card when the catalog does not know them. */
export function pipelineStagesFor(bookingTypeIds, catalog) {
  const reachable = bookingTypeIds.flatMap((id) => catalog?.booking_type_statuses?.[String(id)] ?? []);
  if (reachable.length === 0) return PIPELINE_STAGES;
  return PIPELINE_STAGES.filter((stage) => STAGE_STATUSES[stage].some((status) => reachable.includes(status)));
}

/** Short side stages are counted inside the pipeline card next to them, when they have no card of their own. */
export const FOLDED_INTO = { supplier_files: 'supplier_approval' };

/** Rows shown in each bottleneck table. */
export const BOTTLENECK_ROWS = 8;

/** Headline tile colours. */
export const STAT_COLOR = { open: '#3D314A', awaiting: '#2E7470', overdue: '#B4423A', stale: '#B08A3E' };
