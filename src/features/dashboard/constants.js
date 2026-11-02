/** How a stage's severity is shown in the bottleneck table. */
export const SEVERITY = {
  critical: { label: 'חריגה', tone: 'bad' },
  warning: { label: 'קרוב ליעד', tone: 'warn' },
  ok: { label: 'תקין', tone: 'ok' },
  no_target: { label: 'ללא יעד', tone: '' },
};

/** The dashboard's time windows, in days. */
export const WINDOWS = [
  { value: '7', label: 'שבוע' },
  { value: '30', label: '30 ימים' },
  { value: '90', label: 'רבעון' },
];

export const DEFAULT_WINDOW_DAYS = 30;

/** Stages where a booking waits for an approver's decision. */
export const APPROVAL_STAGES = ['control_officer', 'vice_approver', 'approver'];

/** The six cards of the stage pipeline, always shown. */
export const PIPELINE_STAGES = ['control_officer', 'vice_approver', 'approver', 'supplier_approval', 'supplier_number', 'realization'];

/** Short side stages are counted inside the pipeline card next to them. */
export const FOLDED_INTO = { supplier_files: 'supplier_approval', barber_done: 'realization' };

/** Rows shown in each bottleneck table. */
export const BOTTLENECK_ROWS = 8;

/** Headline tile colours. */
export const STAT_COLOR = { open: '#457AEE', awaiting: '#0EA5E9', overdue: '#E53F63', stale: '#F6AC2F' };
