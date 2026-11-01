/**
 * Types of the service-on-click-api admin contract (docs/admin-api.md of the API project), checked against live responses.
 * The UI is built from `Me.capabilities` and each booking's `actions` - nothing in here is a rule, only a shape.
 */

// ---------- envelopes

export interface PageMeta {
  total: number;
  page: number;
  last_page: number;
  per_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** `{ data, message? }` - the shape of every single-record answer. */
export interface Envelope<T> {
  data: T;
  message?: string;
}

// ---------- start-up: who am I, what can I see

export type Capability =
  | 'audit.view'
  | 'sync.view'
  | 'sync.operate'
  | 'sla.manage'
  | 'config.global'
  | 'users.manage'
  | 'dashboard.view'
  | 'reports.view'
  | 'targets.manage';

export interface SessionUser {
  uuid: string;
  personal_number: string;
  personal_id: string | null;
  full_name: string | null;
  unit_id: number | null;
  unit_name: string | null;
  department_id: number | null;
  department_name: string | null;
}

export interface Me {
  user: SessionUser;
  roles: string[];
  /** `{role}_{booking_type_id}`, e.g. `approver_8`. */
  permissions: string[];
  capabilities: Record<Capability, boolean>;
  is_super_admin: boolean;
  is_admin: boolean;
  /** A vice approver / control officer on every type they manage: the queue is their only screen. */
  is_handler_only: boolean;
  managed_booking_types: number[];
  dashboard_booking_types: number[];
}

export type StageId =
  | 'control_officer'
  | 'vice_approver'
  | 'approver'
  | 'supplier_files'
  | 'supplier_approval'
  | 'supplier_number'
  | 'realization'
  | 'barber_done'
  | 'closed';

export interface CatalogStatus {
  id: number;
  name: string;
  display_name: string;
  position: number;
}

export interface CatalogStage {
  id: StageId;
  label: string;
}

export interface CatalogRole {
  id: number;
  name: string;
  label: string;
}

export interface CatalogBookingType {
  id: number;
  name: string;
  display_name: string;
  icon: string | null;
  is_outsource: number | boolean;
  position: number | string;
  has_group: number | boolean;
}

export interface CatalogGroup {
  id: number;
  name: string;
  display_name: string;
}

export interface CatalogUnit {
  id: number;
  /** The unit's letter - the only thing the mobile app knows. */
  code: string;
  /** The name people see in this system. */
  name: string;
}

/** The catalog lists ACTIVE departments only, as `{ id, unit_id, name }` (`is_active` is never sent; the organisation screen has it). */
export interface CatalogDepartment {
  id: number;
  unit_id: number;
  name: string;
  is_active?: boolean;
}

export interface CatalogActionType {
  id: number;
  type: string;
  display_type: string;
}

export interface Catalog {
  statuses: CatalogStatus[];
  stages: CatalogStage[];
  roles: CatalogRole[];
  booking_types: CatalogBookingType[];
  /** booking type id -> the status ids that type can reach. */
  booking_type_statuses: Record<string, number[]>;
  groups: CatalogGroup[];
  units: CatalogUnit[];
  departments: CatalogDepartment[];
  action_types: CatalogActionType[];
}

// ---------- bookings

export interface BookingAction {
  status_id: number;
  label: string;
  comment_required: boolean;
}

export type SyncState = 'pending' | 'conflict' | 'synced';
/** `external` the mobile app, `internal` a person here, `system` automatic. */
export type ChangeSource = 'external' | 'internal' | 'system';

export interface BookingRow {
  uuid: string;
  serial_number: number;
  booking_type_id: number;
  booking_type_label: string;
  unit_id: number | null;
  owner_uuid: string | null;
  owner_name: string | null;
  owner_personal_id: string | null;
  status_id: number;
  status_label: string;
  stage: StageId;
  stage_label: string;
  stage_age_hours: number | null;
  total_age_hours: number | null;
  target_hours: number | null;
  overdue: boolean;
  status_source: ChangeSource;
  version: number;
  attachments_count: number;
  opened_at: string | null;
  status_changed_at: string | null;
  sync_state: SyncState;
  has_conflict: boolean;
  actions: BookingAction[];
}

export interface FieldTypeRef {
  id?: number;
  name: string;
}

/** A chosen option; a choice can chain further (`option_fields`) and a multi-select is an array of these. */
export interface OptionNode {
  display_name: string;
  field_type?: FieldTypeRef;
  /** Free text / quantity that goes with the option (e.g. "other: special size"). */
  value?: string | number | null;
  option_fields?: OptionNode | OptionNode[];
  parent_option_id?: number | null;
}

/**
 * One entry of `booking_values`. Three shapes share it: a plain field (`value`), a choice (`option_fields`), and a
 * group that carries child fields (`form_fields`) - which can also have a choice of its own.
 */
export interface BookingValueNode {
  id?: number;
  form_field_id?: number;
  uuid?: string;
  field_uuid?: string;
  field_name: string;
  field_display_name: string;
  field_type: FieldTypeRef;
  editable?: boolean;
  is_required?: boolean;
  /** A plain value; for a multi-date a list of strings; for a file / image field a list of upload descriptors (never displayed - see `isUploadNode`). */
  value?: string | number | boolean | null | unknown[];
  option_fields?: OptionNode | OptionNode[];
  form_fields?: BookingValueNode[];
}

export interface BookingPerson {
  uuid: string;
  full_name: string | null;
  personal_id: string | null;
  phone: string | null;
}

export interface BookingComment {
  id: number;
  comment: string;
  /** Already formatted by the server, `d/m/Y`. */
  created_at: string;
  user: BookingPerson | null;
}

export interface HistoryEntry {
  action_type_id: number | null;
  action_label: string | null;
  status_id: number;
  status_label: string;
  actor_name: string | null;
  actor_id: string | null;
  source: ChangeSource;
  occurred_at: string;
  correlation_id: string | null;
}

export interface Attachment {
  kind: 'file' | 'image';
  id: number;
  name: string;
  mime: string | null;
  /** True for images and PDFs: shown in the page. False: offer a download. */
  inline: boolean;
  /** False until the bytes arrive from the mobile app. */
  available: boolean;
  /** Relative (`/api/...`), needs the login cookie. Null while not available. */
  url: string | null;
}

export interface EditableField {
  form_field_id: number;
  field_display_name: string;
  /** date = 3, time = 4 */
  field_type_id: number;
}

export interface OpenConflict {
  id: number;
  [key: string]: unknown;
}

export interface BookingSync {
  pending_export: boolean;
  ext_status_id: number | null;
  ext_status_label: string | null;
  open_conflict: OpenConflict | null;
}

export interface BookingDetail extends BookingRow {
  booking_owner: BookingPerson | null;
  vice_approver: BookingPerson | null;
  booking_values: BookingValueNode[];
  comments: BookingComment[];
  attachments: Attachment[];
  history: HistoryEntry[];
  can_edit_values: boolean;
  editable_fields: EditableField[];
  sync: BookingSync;
  /** The audit rows of this booking - super admin only, otherwise null. */
  audit: BookingAuditRow[] | null;
}

/** An audit row as embedded in a booking: the same as `AuditRow` without the fields that are implied by the booking itself. */
export type BookingAuditRow = Pick<AuditRow, 'occurred_at' | 'actor_id' | 'actor_name' | 'source' | 'action' | 'before' | 'after' | 'reason' | 'result' | 'correlation_id'>;

export interface StatusChangeResult {
  serial_number: number;
  status_id: number;
  status_label: string;
  version: number;
  correlation_id: string | null;
  sync_state: SyncState;
}

export interface ValuesUpdateResult {
  version: number;
  changed: string[];
}

// ---------- dashboards

export interface StageBucket {
  count: number;
  serials: number[];
}

export interface TrendPoint {
  day: string;
  opened: number;
  closed: number;
}

export interface Overview {
  open_total: number;
  total: number;
  awaiting_me: StageBucket;
  overdue: StageBucket;
  needs_decision: StageBucket;
  stale: StageBucket;
  by_stage: Partial<Record<StageId, number>>;
  by_type: Record<string, number>;
  by_type_stage: Record<string, Partial<Record<StageId, number>>>;
  by_status: Record<string, number>;
  [key: string]: unknown;
}

export interface HomeDomain {
  booking_type_id: number;
  name: string;
  icon: string | null;
  group: string | null;
  open: number;
  total: number;
  target_hours: number | null;
  overdue: number | null;
}

export interface Home {
  domains: HomeDomain[];
  by_type_stage: Record<string, Partial<Record<StageId, number>>>;
}

export type Severity = 'critical' | 'warning' | 'ok' | 'no_target';

export interface StageAnalysis {
  stage: StageId;
  label: string;
  wait_kind: 'approval' | 'customer_info' | 'supplier' | 'realization' | string;
  open_count: number;
  open_booking_ids: number[];
  overdue_booking_ids: number[];
  oldest_open_hours: number | null;
  avg_hours: number | null;
  median_hours: number | null;
  p90_hours: number | null;
  sample_size: number;
  share_of_lead_time: number | null;
  target_hours: number | null;
  breached_open: number | null;
  near_breach_open: number | null;
  severity: Severity;
  top_handlers: unknown;
  prev_median_hours?: number | null;
}

export interface Rates {
  closed: number;
  completed_pct: number;
  rejected_pct: number;
  canceled_by_user_pct: number;
  canceled_by_approver_pct: number;
}

export interface SlaTarget {
  booking_type_id: number;
  target_hours: number;
  warn_ratio: number | null;
  set_by?: string | null;
}

export interface DomainDashboard {
  booking_type_ids: number[];
  window_days: number;
  target: SlaTarget | null;
  totals: {
    open: number;
    closed: number;
    closed_in_window: number;
    total: number;
    overdue: number;
    needs_decision: number;
    stale: number;
  };
  handling: { median_hours: number | null; p90_hours: number | null; avg_hours: number | null; sample: number };
  by_stage: Partial<Record<StageId, number>>;
  stages: StageAnalysis[];
  rates: Rates;
  oldest: BookingRow[];
  overdue_serials: number[];
  trend: TrendPoint[];
  definitions: string;
}

export interface Bottlenecks {
  window_days: number;
  stages: StageAnalysis[];
  by_type: { booking_type_id: number; label: string; stage: StageId; stage_label: string; open: number }[];
  handlers: { name: string; transitions: number; median_hours: number | null }[];
  pools: {
    booking_type_id: number;
    label: string;
    stage: StageId;
    stage_label: string;
    open: number;
    role: string;
    holders: number;
    per_holder: number;
  }[];
  rates: Rates;
  definitions: string;
}

export interface ReportRow {
  serial_number: number;
  booking_type_id: number;
  booking_type_label: string;
  group_id: number | null;
  group_label: string | null;
  status_id: number;
  status_label: string;
  stage: StageId;
  stage_label: string;
  owner_name: string | null;
  owner_personal_id: string | null;
  unit_id: number | null;
  unit_name: string | null;
  department_id: number | null;
  department_name: string | null;
  opened: string | null;
  updated: string | null;
  total_age_hours: number | null;
  target_hours: number | null;
  overdue: boolean;
  handling_hours: number | null;
}

export interface Reports {
  rows: ReportRow[];
  total: number;
  truncated: boolean;
}

// ---------- settings of a booking type

export interface SystemReference {
  id: number;
  name: string;
  title: string;
  description: string | null;
  field_type_id: number;
  /** The decoded settings, e.g. `{ stock_cars: 15 }` or `{ dates: ["2026-12-01"] }`. */
  value: Record<string, unknown>;
}

export interface FormField {
  id: number;
  parent_id: number | null;
  field_name: string;
  field_display_name: string;
  field_type_id: number;
  is_required: boolean;
  editable: boolean;
  position: number;
  version: number;
  /** How many bookings hold a value for the field. */
  used_by: number;
  /** Made in this system (`int_...`) as opposed to one of the mobile app's. */
  is_custom: boolean;
  can_change_type: boolean;
  can_remove: boolean;
}

export interface FieldType {
  id: number;
  name: string;
  display_name: string;
  has_options: boolean;
  can_be_editable: boolean;
}

export interface OptionRow {
  id: number;
  form_field_id: number;
  parent_id: number | null;
  name: string;
  category_name: string | null;
  has_category: boolean;
  gender: number;
}

export interface Statement {
  id: number;
  statement: string | null;
  is_active: boolean;
  /** 0 = right after the form opens, 1 = when the user submits. */
  show_time: 0 | 1;
}

export interface SettingsManager {
  uuid: string;
  full_name: string;
  personal_number: string;
  roles: string[];
}

export interface Settings {
  system_references: SystemReference[];
  form_fields: FormField[];
  field_types: FieldType[];
  options: OptionRow[];
  statement: Statement | null;
  managers: SettingsManager[];
  open_count: number;
  can_edit_global: boolean;
}

export interface RestrictionImpact {
  new_dates: string[];
  removed_dates: string[];
  affected_count: number;
  affected_serials: number[];
  affected_in_other_units: number;
  cancel_status_id: number;
  cancel_status_label: string;
}

export interface DeleteFieldResult {
  mode: 'delete' | 'archive';
  used_by: number;
}

/** What the server answers to a created / changed form field: the field as the form editor needs it, plus the names of its options. */
export interface FieldSnapshot {
  id: number;
  field_name: string;
  unit_id: number;
  booking_type_id: number;
  field_display_name: string;
  field_type_id: number;
  is_required: boolean;
  editable: boolean;
  position: number;
  version: number;
  is_custom: boolean;
  options: string[];
}

/** The option `PUT update-option` saved, with the attributes the server derived (type, payload section, free-input flag). */
export interface SavedOption {
  option_id: number;
  uuid: string;
  option_name: string;
  field_type_id: number;
  has_category: boolean;
  form_field_id: number;
  parent_option_id: number | null;
  payload_section_id: number;
  is_input: boolean;
}

/** One row of `GET get-siblings-options/{optionId}` - the only read that tells an option's `field_type_id`. */
export interface OptionSibling {
  option_id: number;
  option_name: string;
  field_type: string | null;
  field_type_id: number | null;
  has_category: boolean;
  form_field_id: number;
  parent_option_id: number | null;
}

export interface OptionSiblings {
  parent: { id: number | null; name: string | null };
  /** The option itself and the options that share its parent. */
  siblings: OptionSibling[];
}

// ---------- people and organisation

export interface NamedRef {
  id: number;
  name: string;
  display_name: string;
}

/**
 * A row of `GET /users`. People the mobile app brought in (through their bookings) are known by ID number only until someone
 * adds them here: their `name` and `personal_number` are null.
 */
export interface AppUser {
  uuid: string;
  name: string | null;
  personal_number: string | null;
  personal_id: string | null;
  phone: string | null;
  unit_id: number | null;
  unit_name: string | null;
  department_id: number | null;
  department_name: string | null;
  roles: NamedRef[];
  permissions: NamedRef[];
}

/**
 * A row of `get-approvers` (and of the answer to `assign-admin-role`). `permissions` holds ONE entry per booking type - the server
 * de-duplicates by type - so a person who is both approver and vice approver of a type shows only one of the two here.
 * The exact flags per type come from `get-approver-permissions`.
 */
export interface ApproverRow {
  uuid: string;
  full_name: string | null;
  personal_number: string | null;
  phone: string | null;
  permissions: { booking_type_id: number; role: string; display_name: string; icon: string | null }[];
}

export interface AdminRow {
  uuid: string;
  full_name: string | null;
  personal_number: string | null;
}

export interface RolePermissionRow {
  booking_type_id: number;
  name: string;
  display_name: string;
  icon: string | null;
  /** `is_approver`, `is_vice_approver`, ... one flag per role that applies to the type. */
  [flag: string]: unknown;
}

/**
 * `get-approver-permissions` / `get-admin-permissions`. `permissions` has one row per booking type the CALLER may grant on - for the
 * super admin the approver version of it is empty today (the server derives the types from the caller's own `admin_*` permissions).
 */
export interface UserPermissions {
  role_options?: Record<string, number>;
  user: { full_name: string | null; personal_number: string | null };
  permissions: RolePermissionRow[];
}

export interface OrgDepartment {
  id: number;
  unit_id: number;
  name: string;
  is_active: boolean;
  users: number;
}

export interface OrgUnit {
  id: number;
  code: string;
  name: string;
  users: number;
  departments: OrgDepartment[];
}

// ---------- audit and sync (super admin)

export type AuditResult = 'success' | 'denied' | 'failed';

export interface AuditRow {
  id: number;
  occurred_at: string;
  actor_type: string | null;
  actor_id: string | null;
  actor_name: string | null;
  source: 'internal' | 'external' | 'automation' | string;
  action: string;
  entity_type: string | null;
  entity_id: string | number | null;
  booking_serial: number | null;
  unit_id: number | null;
  booking_type_id: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  result: AuditResult;
  correlation_id: string | null;
}

export interface AuditVerify {
  valid: boolean;
  checked: number;
  broken_at: number | null;
}

export interface SyncHealth {
  export_enabled: boolean;
  config_channel_enabled: boolean;
  last_sent_at: string | null;
  pending_decisions: number;
  queued_value_files: number;
  queued_config_files: number;
  blocked_files: number;
  failed_files: number;
  open_conflicts: number;
}

export type SyncFileKind = 'booking_status' | 'booking_values' | 'system_config';
export type SyncFileState = 'queued' | 'sent' | 'failed' | 'superseded' | 'blocked' | 'awaiting_external_support';

export interface SyncFile {
  id: number;
  kind: SyncFileKind;
  state: SyncFileState;
  [key: string]: unknown;
}

export interface SyncConflict {
  id: number;
  [key: string]: unknown;
}

export interface SyncOverview {
  health: SyncHealth;
  files: SyncFile[];
  conflicts: SyncConflict[];
  pending_decisions: Record<string, unknown>[];
  can_operate: boolean;
}

export type ConflictResolution = 'accept_external' | 'keep_internal';
