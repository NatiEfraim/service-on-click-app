/** Typed service-on-click-api calls. Reads return `data`; writes return the envelope (server `message`). */
import { getData, getPage, http, send, type Params } from './client';
import type {
  AdminRow,
  ApproverRow,
  AppUser,
  AuditRow,
  AuditVerify,
  Bottlenecks,
  BookingDetail,
  BookingRow,
  Catalog,
  ConflictResolution,
  DeleteFieldResult,
  DomainDashboard,
  FieldSnapshot,
  Home,
  Me,
  OptionSiblings,
  OrgDepartment,
  OrgUnit,
  Overview,
  Reports,
  RestrictionImpact,
  SavedOption,
  Settings,
  SlaTarget,
  StatusChangeResult,
  SyncFile,
  SyncOverview,
  UserPermissions,
  ValuesUpdateResult,
} from './types';

const APPROVER = '/bookings-approver-management';
const ADMIN = '/bookings-admin-management';
const SUPER = '/bookings-super-admin-management';

export interface LoginAnswer {
  'full name': string;
  personal_number: string;
  role: string[];
  permissions: string[];
}

export const authApi = {
  /** Local development only: logs in by personal number and sets the HttpOnly cookie. */
  async login(personalNumber: string): Promise<LoginAnswer> {
    const response = await http.post<LoginAnswer>('/login', { personal_number: personalNumber });
    return response.data;
  },
  async logout(): Promise<void> {
    await http.post('/logout');
  },
};

export const startupApi = {
  me: (signal?: AbortSignal) => getData<Me>(`${APPROVER}/me`, undefined, signal),
  catalog: (signal?: AbortSignal) => getData<Catalog>(`${APPROVER}/catalog`, undefined, signal),
};

export interface BookingListParams extends Params {
  /** serial (substring), ID / personal number (prefix) or name */
  q?: string;
  statuses?: string;
  types?: string;
  units?: string;
  stage?: string;
  from?: string;
  to?: string;
  open_only?: boolean;
  ids?: string;
  /** uuid of a user who moved the booking */
  handler?: string;
  mine?: boolean;
  overdue?: boolean;
  sync?: 'conflict' | 'pending' | 'synced' | '';
  sort?: 'serial_number' | 'status_changed_at' | 'created_at' | 'status_id' | 'booking_type_id' | 'stage_age_hours';
  dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface ChangeStatusBody {
  status_id: number;
  version: number;
  comment?: string | null;
}

export const bookingsApi = {
  list: (params: BookingListParams, signal?: AbortSignal) => getPage<BookingRow>(`${APPROVER}/bookings`, params, signal),
  get: (serial: number, signal?: AbortSignal) => getData<BookingDetail>(`${APPROVER}/bookings/${serial}`, undefined, signal),
  /** One `idempotencyKey` per user action; a repeat returns the first result. */
  changeStatus: (serial: number, body: ChangeStatusBody, idempotencyKey: string) =>
    send<StatusChangeResult>('post', `${APPROVER}/bookings/${serial}/status`, body, { headers: { 'Idempotency-Key': idempotencyKey } }),
  /** `values`: form_field_id -> new value (`Y-m-d` for a date, `HH:MM` for a time). */
  updateValues: (serial: number, body: { values: Record<string, string>; version: number; reason?: string | null }) =>
    send<ValuesUpdateResult>('put', `${APPROVER}/bookings/${serial}/values`, body),
};

export interface DashboardParams extends Params {
  types?: readonly number[];
  days?: number;
}

export interface BottleneckParams extends Params {
  days?: number;
  types?: readonly number[];
  unit?: number;
}

export interface ReportParams extends Params {
  serial?: string;
  types?: string;
  groups?: string;
  statuses?: string;
  units?: string;
  departments?: string;
  requester?: string;
  personal_id?: string;
  opened_from?: string;
  opened_to?: string;
  updated_from?: string;
  updated_to?: string;
  stage?: string;
  overdue?: 'yes' | 'no' | '';
  min_age_days?: string | number;
}

export const insightsApi = {
  overview: (signal?: AbortSignal) => getData<Overview>(`${APPROVER}/overview`, undefined, signal),
  home: (signal?: AbortSignal) => getData<Home>(`${ADMIN}/home`, undefined, signal),
  domainDashboard: (params: DashboardParams, signal?: AbortSignal) => getData<DomainDashboard>(`${APPROVER}/domain-dashboard`, params, signal),
  bottlenecks: (params: BottleneckParams, signal?: AbortSignal) => getData<Bottlenecks>(`${APPROVER}/bottlenecks`, params, signal),
  reports: (params: ReportParams, signal?: AbortSignal) => getData<Reports>(`${ADMIN}/reports`, params, signal),
  targets: (signal?: AbortSignal) => getData<SlaTarget[]>(`${ADMIN}/targets`, undefined, signal),
  /** `target_hours: null` removes the target. 1 hour .. 180 days; `warn_ratio` strictly between 0 and 1. */
  setTarget: (body: { booking_type_id: number; target_hours: number | null; warn_ratio?: number }) =>
    send<SlaTarget | null>('put', `${ADMIN}/targets`, body),
};

export interface NewFieldBody {
  field_display_name: string;
  field_type_id: number;
  is_required?: boolean;
  editable?: boolean;
  /** only for choice types */
  options?: string[];
}

export interface UpdateFieldBody {
  version: number;
  field_display_name?: string;
  field_type_id?: number;
  is_required?: boolean;
  editable?: boolean;
}

/** The server rewrites every omitted attribute (parent, category, type, is_input), so always send all of them. */
export interface SaveOptionBody {
  option_id?: number | null;
  /** 1-50 characters: letters, digits, spaces and `" ' , . - ( )`; sibling duplicates are not refused. */
  option_name: string;
  parent_option_id?: number | null;
  has_category?: boolean;
  field_type_id?: number | null;
  is_input?: boolean;
}

export const settingsApi = {
  get: (unitId: number, bookingTypeId: number, signal?: AbortSignal) =>
    getData<Settings>(`${APPROVER}/settings/${unitId}/${bookingTypeId}`, undefined, signal),
  /** Previews which bookings the blocked dates would cancel; saves nothing. */
  restrictionImpact: (referenceId: number, dates: string[]) =>
    send<RestrictionImpact>('post', `${APPROVER}/settings/references/${referenceId}/impact`, { dates }),
  /** The reference must belong to the caller's own unit (else 422); blocking a date cancels open bookings. */
  saveSystemReferences: (bookingTypeId: number, details: Record<string, Record<string, unknown>>) =>
    send('put', `${APPROVER}/system-references`, { booking_type_id: bookingTypeId, details_values: details }),

  /** 201: the new field, placed last. */
  createField: (unitId: number, bookingTypeId: number, body: NewFieldBody) =>
    send<FieldSnapshot>('post', `${SUPER}/form-fields/${unitId}/${bookingTypeId}`, body),
  updateField: (id: number, body: UpdateFieldBody) => send<FieldSnapshot>('put', `${SUPER}/form-fields/${id}`, body),
  /** `ids`: all stand-alone fields (`parent_id: null`) in the new order. */
  reorderFields: (unitId: number, bookingTypeId: number, ids: number[]) =>
    send<{ saved: boolean; order: string[] }>('put', `${SUPER}/form-fields/${unitId}/${bookingTypeId}/order`, { ids }),
  removeField: (id: number, version?: number) => send<DeleteFieldResult>('delete', `${SUPER}/form-fields/${id}`, undefined, { params: version ? { version } : undefined }),
  setFieldEditable: (id: number, editable: boolean, version: number) =>
    send<{ id: number; editable: boolean; version: number }>('put', `${SUPER}/form-fields/${id}/editable`, { editable, version }),

  saveOption: (formFieldId: number, body: SaveOptionBody) => send<SavedOption>('put', `${SUPER}/update-option/${formFieldId}`, body),
  /** Archives an option that bookings chose, otherwise deletes it; never remove one that has children. */
  removeOption: (formFieldId: number, optionId: number) => send('delete', `${SUPER}/remove-option/${formFieldId}`, { option_id: optionId }),
  /** Carries `field_type_id`, which the settings list lacks and a rename must send back. */
  optionSiblings: (optionId: number, signal?: AbortSignal) => getData<OptionSiblings>(`${SUPER}/get-siblings-options/${optionId}`, undefined, signal),
  /** `statement: null` with `is_active: true` is refused (400). */
  saveStatement: (unitId: number, bookingTypeId: number, body: { statement: string | null; is_active: boolean; show_time?: 0 | 1 }) =>
    send('put', `${SUPER}/update-statement/${unitId}/${bookingTypeId}`, body),
};

export interface NewUserBody {
  personal_number: string;
  full_name: string;
  phone?: string | null;
  unit_id?: number;
  department_id?: number | null;
}

export interface ApproverAssignment {
  booking_type_id: number;
  is_approver: boolean;
  is_vice_approver: boolean;
  [flag: string]: boolean | number;
}

export interface AssignApproverBody {
  uuid?: string;
  personal_number?: string;
  full_name?: string;
  phone?: string | null;
  reason?: string | null;
  role_assignments: ApproverAssignment[];
}

export interface AssignAdminBody {
  uuid?: string;
  personal_number?: string;
  full_name?: string;
  phone?: string | null;
  unit_id?: number;
  reason?: string | null;
  role_assignments: { booking_type_id: number; is_admin: boolean }[];
}

export const peopleApi = {
  /** 20 per page, no `meta`: a full page means there may be more. */
  users: async (identifier = '', page = 1, signal?: AbortSignal): Promise<AppUser[]> => {
    const id = identifier.trim().replace(/\s+/g, '');
    return getData<AppUser[]>(`/users${id ? `/${encodeURIComponent(id)}` : ''}`, { page: page > 1 ? page : undefined }, signal);
  },
  createUser: (body: NewUserBody) => send<AppUser>('post', '/users', body),
  /** Paged like `users`; `identifier` is a personal-number or full-name prefix. */
  approvers: (identifier = '', signal?: AbortSignal, page = 1) =>
    getData<ApproverRow[]>(`${ADMIN}/get-approvers`, { identifier: identifier.trim(), page: page > 1 ? page : undefined }, signal),
  /** Super admin. A digit string longer than 9 is refused (422 / 204). */
  admins: (identifier = '', signal?: AbortSignal, page = 1) =>
    getData<AdminRow[]>(`${SUPER}/get-admins`, { identifier: identifier.trim(), page: page > 1 ? page : undefined }, signal),
  approverPermissions: (uuid: string, signal?: AbortSignal) => getData<UserPermissions>(`${ADMIN}/get-approver-permissions/${uuid}`, undefined, signal),
  adminPermissions: (uuid: string, signal?: AbortSignal) => getData<UserPermissions>(`${SUPER}/get-admin-permissions/${uuid}`, undefined, signal),
  assignApprover: (body: AssignApproverBody) => send<ApproverRow[]>('post', `${ADMIN}/assign-approver-role`, body),
  assignAdmin: (body: AssignAdminBody) => send<ApproverRow[]>('post', `${SUPER}/assign-admin-role`, body),
  setDepartment: (userUuid: string, departmentId: number | null) =>
    send('put', `${ADMIN}/users/${userUuid}/department`, { department_id: departmentId }),
};

export const orgApi = {
  list: (signal?: AbortSignal) => getData<OrgUnit[]>(`${SUPER}/org`, undefined, signal),
  /** A unit's `code` is immutable; updates resend the same one. */
  createUnit: (body: { code: string; name: string }) => send<Pick<OrgUnit, 'id' | 'code' | 'name'>>('post', `${SUPER}/org/units`, body),
  updateUnit: (id: number, body: { code: string; name: string }) => send<Pick<OrgUnit, 'id' | 'code' | 'name'>>('put', `${SUPER}/org/units/${id}`, body),
  createDepartment: (unitId: number, body: { name: string }) => send<OrgDepartment>('post', `${SUPER}/org/units/${unitId}/departments`, body),
  updateDepartment: (id: number, body: { name?: string; is_active?: boolean }) => send<OrgDepartment>('put', `${SUPER}/org/departments/${id}`, body),
};

export interface AuditParams extends Params {
  serial?: string;
  /** personal number */
  actor?: string;
  /** prefix such as `booking.`, `config.`, `user.` */
  action?: string;
  source?: 'internal' | 'external' | 'automation' | '';
  type?: number | string;
  result?: 'success' | 'denied' | 'failed' | '';
  from?: string;
  to?: string;
  page?: number;
}

export const auditApi = {
  list: (params: AuditParams, signal?: AbortSignal) => getPage<AuditRow>(`${SUPER}/audit`, params, signal),
  verify: (signal?: AbortSignal) => getData<AuditVerify>(`${SUPER}/audit/verify`, undefined, signal),
};

export const syncApi = {
  overview: (signal?: AbortSignal) => getData<SyncOverview>(`${SUPER}/sync`, undefined, signal),
  file: (id: number, signal?: AbortSignal) => getData<SyncFile & Record<string, unknown>>(`${SUPER}/sync/files/${id}`, undefined, signal),
  retry: (id: number) => send('post', `${SUPER}/sync/files/${id}/retry`),
  /** Sends pending decisions now instead of on schedule. */
  run: () => send('post', `${SUPER}/sync/run`),
  resolveConflict: (id: number, body: { resolution: ConflictResolution; reason: string }) => send('post', `${SUPER}/sync/conflicts/${id}/resolve`, body),
};
