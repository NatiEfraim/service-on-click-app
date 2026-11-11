/** Typed service-on-click-api calls. Reads return `data`; writes return the envelope (server `message`). */
import { getData, getPage, http, send } from './client';
import { validateVaticanPerson } from './vatican';


const APPROVER = '/bookings-approver-management';
const ADMIN = '/bookings-admin-management';
const SUPER = '/bookings-super-admin-management';



export const authApi = {
  /** Local development only: logs in by personal number and sets the HttpOnly cookie. */
  async login(personalNumber) {
    const response = await http.post('/login', { personal_number: personalNumber });
    return response.data;
  },
  async logout() {
    await http.post('/logout');
  },
};

/** Statuses of a closed booking (mirror the API's StatusBookingEnum::isTerminal); every other status is open. */
export const CLOSED_STATUS_IDS = [4, 5, 6, 7, 11, 12, 13];
export const OPEN_STATUS_IDS = [1, 2, 3, 8, 9, 10, 14, 15, 16, 17, 18];

/** A plain user (no management role): the requester endpoints the mobile app uses. */
export const requesterApi = {
  /** The signed-in user (`full_name`, `personal_number`, ...). */
  user: (signal) => getData('/user', undefined, signal),
  /** One of the user's own bookings in full (GET /bookings/{uuid}, ShowBookingResource): status, values, comments. */
  booking: (uuid, signal) => getData(`/bookings/${uuid}`, undefined, signal),
  /** The user's own bookings, 20 a page, newest first; `statusIds` narrows them (sent as status_id[]). */
  myBookings: async (page, statusIds, signal, serialNumber = '') => {
    // axios writes an array as status_id[]=1&status_id[]=2, which the API reads (cleanParams would join it)
    const response = await http.get('/bookings/my-bookings', { params: { page, status_id: statusIds?.length ? statusIds : undefined, serial_number: serialNumber || undefined }, signal });
    return response.data;
  },
};

export const startupApi = {
  me: (signal) => getData(`${APPROVER}/me`, undefined, signal),
  catalog: (signal) => getData(`${APPROVER}/catalog`, undefined, signal),
};





export const bookingsApi = {
  list: (params, signal) => getPage(`${APPROVER}/bookings`, params, signal),
  get: (serial, signal) => getData(`${APPROVER}/bookings/${serial}`, undefined, signal),
  /** One `idempotencyKey` per user action; a repeat returns the first result. */
  changeStatus: (serial, body, idempotencyKey) =>
    send('post', `${APPROVER}/bookings/${serial}/status`, body, { headers: { 'Idempotency-Key': idempotencyKey } }),
  /** `values`: form_field_id -> new value (`Y-m-d` for a date, `HH:MM` for a time). */
  updateValues: (serial, body) =>
    send('put', `${APPROVER}/bookings/${serial}/values`, body),
};







export const insightsApi = {
  overview: (signal) => getData(`${APPROVER}/overview`, undefined, signal),
  /** System admin and camp commander only (the route lives under the admin prefix on the API). */
  home: (signal) => getData(`${ADMIN}/home`, undefined, signal),
  barberDashboard: (signal) => getData(`${APPROVER}/dashboard/barber-booking`, undefined, signal),
  domainDashboard: (params, signal) => getData(`${APPROVER}/domain-dashboard`, params, signal),
  bottlenecks: (params, signal) => getData(`${APPROVER}/bottlenecks`, params, signal),
  reports: (params, signal) => getData(`${ADMIN}/reports`, params, signal),
  targets: (signal) => getData(`${ADMIN}/targets`, undefined, signal),
  /** `target_hours: null` removes the target. 1 hour .. 180 days; `warn_ratio` strictly between 0 and 1. */
  setTarget: (body) =>
    send('put', `${ADMIN}/targets`, body),
};







export const settingsApi = {
  /** Barber service days ahead: date, day_name, taken (booked slots), service_hours, break_hour. Read-only. */
  barberDays: (signal) => getData(`${APPROVER}/barber-bookings/dates`, undefined, signal),
  /** One day's barber appointments: time, user, booking (serial, status). Read-only. */
  barberDayBookings: (date, signal) => getData(`${APPROVER}/barber-bookings/order-bookings`, { date }, signal),
  get: (unitId, bookingTypeId, signal) =>
    getData(`${APPROVER}/settings/${unitId}/${bookingTypeId}`, undefined, signal),
  /** Previews which bookings the blocked dates would cancel; saves nothing. */
  restrictionImpact: (referenceId, dates) =>
    send('post', `${APPROVER}/settings/references/${referenceId}/impact`, { dates }),
  /** The reference must belong to the caller's own unit (else 422); blocking a date cancels open bookings. */
  saveSystemReferences: (bookingTypeId, details) =>
    send('put', `${APPROVER}/system-references`, { booking_type_id: bookingTypeId, details_values: details }),

  /** 201: the new field, placed last. */
  createField: (unitId, bookingTypeId, body) =>
    send('post', `${SUPER}/form-fields/${unitId}/${bookingTypeId}`, body),
  updateField: (id, body) => send('put', `${SUPER}/form-fields/${id}`, body),
  /** `ids`: all stand-alone fields (`parent_id: null`) in the new order. */
  reorderFields: (unitId, bookingTypeId, ids) =>
    send('put', `${SUPER}/form-fields/${unitId}/${bookingTypeId}/order`, { ids }),
  removeField: (id, version) => send('delete', `${SUPER}/form-fields/${id}`, undefined, { params: version ? { version } : undefined }),
  setFieldEditable: (id, editable, version) =>
    send('put', `${SUPER}/form-fields/${id}/editable`, { editable, version }),

  saveOption: (formFieldId, body) => send('put', `${SUPER}/update-option/${formFieldId}`, body),
  /** Archives an option that bookings chose, otherwise deletes it; never remove one that has children. */
  removeOption: (formFieldId, optionId) => send('delete', `${SUPER}/remove-option/${formFieldId}`, { option_id: optionId }),
  /** Carries `field_type_id`, which the settings list lacks and a rename must send back. */
  optionSiblings: (optionId, signal) => getData(`${SUPER}/get-siblings-options/${optionId}`, undefined, signal),
  /** `statement: null` with `is_active: true` is refused (400). */
  saveStatement: (unitId, bookingTypeId, body) =>
    send('put', `${SUPER}/update-statement/${unitId}/${bookingTypeId}`, body),
};









export const peopleApi = {
  lookupVatican: async (personalNumber, signal) =>
    validateVaticanPerson(await getData('/users/lookup-vatican', { personal_number: personalNumber }, signal), personalNumber),
  /** 20 per page, no `meta`: a full page means there may be more. */
  users: async (identifier = '', page = 1, signal) => {
    const id = identifier.trim().replace(/\s+/g, '');
    return getData(`/users${id ? `/${encodeURIComponent(id)}` : ''}`, { page: page > 1 ? page : undefined }, signal);
  },
  createUser: (body) => send('post', '/users', body),
  /** Paged like `users`; `identifier` is a personal-number or full-name prefix. */
  approvers: (identifier = '', signal, page = 1) =>
    getData(`${ADMIN}/get-approvers`, { identifier: identifier.trim(), page: page > 1 ? page : undefined }, signal),
  /** Super admin. A digit string longer than 9 is refused (422 / 204). */
  admins: (identifier = '', signal, page = 1) =>
    getData(`${SUPER}/get-admins`, { identifier: identifier.trim(), page: page > 1 ? page : undefined }, signal),
  approverPermissions: (uuid, signal) => getData(`${ADMIN}/get-approver-permissions/${uuid}`, undefined, signal),
  adminPermissions: (uuid, signal) => getData(`${SUPER}/get-admin-permissions/${uuid}`, undefined, signal),
  assignApprover: (body) => send('post', `${ADMIN}/assign-approver-role`, body),
  assignAdmin: (body) => send('post', `${SUPER}/assign-admin-role`, body),
  setDepartment: (userUuid, departmentId) =>
    send('put', `${ADMIN}/users/${userUuid}/department`, { department_id: departmentId }),
};

export const orgApi = {
  list: (signal) => getData(`${SUPER}/org`, undefined, signal),
  /** A unit's `code` is immutable; updates resend the same one. */
  createUnit: (body) => send('post', `${SUPER}/org/units`, body),
  updateUnit: (id, body) => send('put', `${SUPER}/org/units/${id}`, body),
  createDepartment: (unitId, body) => send('post', `${SUPER}/org/units/${unitId}/departments`, body),
  updateDepartment: (id, body) => send('put', `${SUPER}/org/departments/${id}`, body),
};



export const auditApi = {
  list: (params, signal) => getPage(`${SUPER}/audit`, params, signal),
  verify: (signal) => getData(`${SUPER}/audit/verify`, undefined, signal),
};

/** Bookings report (admin: their own booking types; super admin: all). The export answers with the .xlsx file itself. */
export const bookingsReportApi = {
  list: (params, signal) => getPage(`${ADMIN}/bookings-report`, params, signal),
  /** Returns { blob, fileName }; the server names the file in Content-Disposition. */
  async exportExcel(filters) {
    const response = await http.post(`${ADMIN}/bookings-report/export`, filters, {
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      timeout: 120_000,
    });
    const disposition = response.headers['content-disposition'] ?? '';
    // quoted or not (Laravel quotes only names with special characters), or the RFC 5987 filename*= form
    const fileName = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? `bookings_${Date.now()}.xlsx`;
    return { blob: response.data, fileName };
  },
};

/** Digital hatch: runs the scheduler's exports (r2b) and imports (b2r) now, inline (sync=1), and returns `data`. */
const HATCH = `${SUPER}/digital-hatch`;
const hatchRun = async (path, body) => (await send('post', `${HATCH}/${path}`, { ...body, sync: 1 })).data;
export const hatchApi = {
  exportBookingStatus: (body) => hatchRun('export-booking-status', body),
  exportUsers: (body) => hatchRun('export-users', body),
  importBookingJson: (body) => hatchRun('import-booking-json', body),
  importApplicationLogJson: (body) => hatchRun('import-application-log-json', body),
  importFiles: (body) => hatchRun('import-files', body),
};

export const syncApi = {
  overview: (signal) => getData(`${SUPER}/sync`, undefined, signal),
  file: (id, signal) => getData(`${SUPER}/sync/files/${id}`, undefined, signal),
  retry: (id) => send('post', `${SUPER}/sync/files/${id}/retry`),
  /** Sends pending decisions now instead of on schedule. */
  run: () => send('post', `${SUPER}/sync/run`),
  resolveConflict: (id, body) => send('post', `${SUPER}/sync/conflicts/${id}/resolve`, body),
};
