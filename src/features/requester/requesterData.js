/**
 * Everything the regular-user home reads or sends, from the website API's requester endpoints:
 * GET /requester/catalog, GET /requester/form/{id}, GET /requester/person-lookup, GET /requester/counters,
 * POST /bookings/{id}, GET /bookings/my-bookings and GET /bookings/{uuid}.
 */

import { OPEN_STATUS_IDS, requesterApi } from '@/lib/api/endpoints';
import { routeFor, routePosition } from '@/features/bookings/route';
import { parsePermissionName } from '@/features/people/permissions';
import { fieldKind, fieldRules } from '@/lib/form-fields';
import { domainIconSrc, requesterIconSrc } from '@/lib/labels';
import { routeStageOf } from '@/lib/routeTypes';
import { topicStatusLabel } from '@/lib/topicTypes';
import { optionText, uploadAttachment, uploadAttachments } from '@/lib/booking-values';

/** Files a form accepts as attachments (POST /bookings/{id}: jpg, jpeg, png, gif, webp, pdf; up to 10, 10 MB each). */
export const ATTACH_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * GET /requester/catalog, shaped for the screens. The server already keeps only what the user may open
 * (the type's requester role and the user's unit). Request types are identified by their booking type id.
 * - topics: [{ id (server name), name, img, groups: [{ id, name, types: [{ id, key, name, description, img }] }] }]
 * - categories: each request type of the topics, then the plain domains, for "הקריאות שלי": [{ id, name, img, typeIds }]
 */
export async function fetchCatalog(signal) {
  const data = await requesterApi.catalog(signal);
  const byPosition = (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0);
  const topics = [...(data?.topics ?? [])].sort(byPosition).map((topic) => ({
    id: topic.name,
    name: topic.display_name,
    img: requesterIconSrc(topic.name),
    groups: [...(topic.groups ?? [])].sort(byPosition).map((group) => ({
      id: group.id,
      name: group.display_name,
      types: [...(group.booking_types ?? [])].sort(byPosition).map((type) => ({
        id: type.id,
        key: type.name,
        name: type.display_name,
        description: type.description ?? '',
        img: domainIconSrc(type.id, type.name),
      })),
    })),
  }));
  const domains = [...(data?.domains ?? [])].sort(byPosition);
  const categories = [
    // every request type of a topic is a category of its own (not the topic as one), with the same id a domain gets
    // ("d<id>"), so the super admin's full domain list adds nothing twice and nothing appears, then vanishes
    ...topics.flatMap((topic) => topic.groups.flatMap((group) => group.types.map((type) => ({ id: `d${type.id}`, name: type.name, img: type.img, typeIds: [type.id] })))),
    ...domains.map((domain) => ({ id: `d${domain.id}`, name: domain.display_name, img: domainIconSrc(domain.id), typeIds: [domain.id] })),
  ];
  return { topics, categories };
}

/**
 * Every booking type the signed-in user has access to: all of them for the super admin, else the types they manage or
 * have a dashboard for, plus every type any of their permissions names ("infosec_officer_15", "approver_3", "user_20").
 * `me.managed_booking_types` alone misses roles the server does not count as managing (the officers of 15-25).
 */
export function accessibleBookingTypeIds(me, allTypeIds) {
  if (me?.is_super_admin) return [...allTypeIds];
  const ids = new Set([...(me?.managed_booking_types ?? []), ...(me?.dashboard_booking_types ?? [])].map(Number));
  for (const name of me?.permissions ?? []) {
    const parsed = parsePermissionName(String(name));
    if (parsed) ids.add(parsed.bookingTypeId);
  }
  return allTypeIds.filter((id) => ids.has(Number(id)));
}

/** Filter categories for the user’s own requests, including types missing from the permission-filtered catalogs. */
export function requestCategories(rows, catalogCategories = [], managedCategories = []) {
  const categories = new Map(managedCategories.map((category) => [category.id, category]));
  for (const category of catalogCategories) categories.set(category.id, category);
  for (const { bookingTypeId, typeName } of rows) {
    if (bookingTypeId == null || !typeName) continue;
    const id = 'd' + bookingTypeId;
    if (!categories.has(id)) {
      categories.set(id, { id, name: typeName, img: domainIconSrc(bookingTypeId), typeIds: [bookingTypeId] });
    }
  }
  return [...categories.values()].sort((a, b) => a.typeIds[0] - b.typeIds[0]);
}

/**
 * A requester file as the shared attachments panel takes it (features/bookings/Attachments, as the management side):
 * an image - by the server's type or its name - shows as a picture and opens in the viewer, so does a PDF; any other
 * file downloads.
 */
export function toAttachment(entry, index) {
  return uploadAttachment(entry, index);
}

/** The type with its topic and group, for the form's breadcrumb; null when the catalog does not offer it. */
export function findType(catalog, typeId) {
  for (const topic of catalog?.topics ?? []) {
    for (const group of topic.groups) {
      const type = group.types.find((candidate) => candidate.id === Number(typeId));
      if (type) return { topic, group, type };
    }
  }
  return null;
}

/**
 * A choice as the form uses it: a "type in a value" choice (isInput) asks for a value of its own type (inputType, as
 * lib/form-fields maps the server's type name); a list carries its sub-choices (children). `code` is the option's
 * stable code (`secret`, `career`…) for UI logic only - the option id is what is sent.
 */
function toChoice(raw) {
  const { inputType, ltr } = fieldKind(raw.field_type?.name);
  return {
    id: raw.id,
    name: raw.name ?? '',
    code: raw.code ?? null,
    isInput: Boolean(raw.is_input),
    inputType,
    ltr,
    children: (raw.children ?? []).map(toChoice),
  };
}

/** The chain of choices from the field's top level down to the one with this id ([] when none is chosen). */
export function choicePath(options, id) {
  if (id === undefined || id === null || id === '') return [];
  for (const option of options) {
    if (String(option.id) === String(id)) return [option];
    const below = choicePath(option.children, id);
    if (below.length) return [option, ...below];
  }
  return [];
}

/**
 * A field as the form draws it: its input (lib/form-fields), its rules (`rules`, from `validations`, with the server's
 * own messages), where it sits (`section`, `colSpan` on the form's 4-column grid), and the person lookup it starts
 * (`lookupSource: "person"`) or is filled from (`autofillKey`).
 */
function toField(raw) {
  const { kind, inputType, ltr } = fieldKind(raw.field_type?.name);
  const rules = fieldRules(raw.validations);
  // a checkbox without options is a declaration to tick (פתיחת משתמש, העברת משתמש יחידה): sent as "1" when ticked
  const declaration = raw.field_type?.name === 'checkbox' && !(raw.options ?? []).length;
  return {
    id: raw.id,
    fieldName: raw.field_name ?? '',
    label: raw.field_display_name ?? raw.field_name ?? '',
    kind: declaration ? 'declaration' : kind,
    inputType,
    ltr,
    required: Boolean(raw.is_required),
    rules,
    regex: rules.regex,
    section: raw.section ?? 'requester',
    colSpan: Math.min(Math.max(Number(raw.col_span) || 1, 1), 4),
    lookupSource: raw.lookup_source ?? null,
    autofillKey: raw.autofill_key ?? null,
    options: (raw.options ?? []).map(toChoice),
    children: [...(raw.children ?? [])].sort((a, b) => a.position - b.position).map(toField),
  };
}

/**
 * Fields the server keeps optional but that belong to one choice of another field (it has no conditional fields): shown,
 * and required, only while that choice is picked; never sent otherwise. By `field_name`. התקנת מדפסת: the printer's IP
 * is needed only for a connected printer.
 */
const SHOWN_WHEN = {
  21: { printer_ip: { field: 'install_type', option: 'מדפסת מחוברת' } },
};

/** The fields to draw and send now, by the values chosen so far; a conditional field that is shown is required. */
export function shownFields(typeId, fields, values) {
  const rules = SHOWN_WHEN[Number(typeId)];
  if (!rules) return fields;
  return fields.flatMap((field) => {
    const rule = rules[field.fieldName];
    if (!rule) return [field];
    const on = fields.find((other) => other.fieldName === rule.field);
    const picked = on ? choicePath(on.options, values[on.id]).at(-1) : null;
    return picked?.name === rule.option ? [{ ...field, required: true }] : [];
  });
}

/**
 * GET /requester/form/{id}: the fields in order (the server filters them to the user's unit). Upload fields are left
 * to the form's own attachments; the handler section (filled during the handling) is never part of the submission.
 */
export async function fetchForm(typeId, signal) {
  const data = await requesterApi.form(typeId, signal);
  return [...(data ?? [])]
    .filter((raw) => !['file', 'image', 'hidden'].includes(raw.field_type?.name) && raw.section !== 'handler')
    .sort((a, b) => a.position - b.position)
    .map(toField);
}

/**
 * Opens a request (POST /bookings/{id}, multipart): `values` maps field id → value (a select's value is its option id),
 * `typed` maps a choice field id → the value typed with its chosen "type in a value" choice (option_values), `files` are
 * the attachments. Returns the new booking; a 422 carries per-field messages (`values.<id>`, `option_values.<id>`, `files.<n>`).
 */
export async function submitRequest(typeId, values, files, typed = {}) {
  const body = new FormData();
  for (const [fieldId, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') body.append(`values[${fieldId}]`, value);
  }
  for (const [fieldId, value] of Object.entries(typed)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') body.append(`option_values[${fieldId}]`, value);
  }
  for (const file of files) body.append('files[]', file);
  return requesterApi.create(typeId, body);
}

/** The four home counters (GET /requester/counters): open, action (waits for the user), handling, done. */
export async function fetchCounters(signal) {
  return requesterApi.counters(signal);
}

/** GET /bookings/my-bookings page size and the page limit for request history. */
const PAGE_SIZE = 20;
const MAX_PAGES = 10;

/**
 * The user's requests from GET /bookings/my-bookings, newest first. The home panel reads every open request.
 */
export async function fetchMyRequests(signal, { openOnly = false } = {}) {
  // the API sends 20 a page with no paging meta: a short page is the last one
  const bookings = [];
  for (let page = 1; openOnly || page <= MAX_PAGES; page += 1) {
    const rows = (await requesterApi.myBookings(page, openOnly ? OPEN_STATUS_IDS : null, signal)).data ?? [];
    bookings.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return bookings.map((booking) => ({
    id: booking.uuid,
    typeName: booking.booking_type?.display_name ?? '',
    bookingTypeId: booking.booking_type?.id,
    serial: booking.serial_number,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    statusId: booking.status?.id,
    statusName: topicStatusLabel(booking.status?.id, booking.booking_type?.id) ?? booking.status?.display_name ?? '',
  }));
}

/**
 * One request in full, for the side panel, from GET /bookings/{uuid}.
 * Shape: statusId, statusName, statusMessage, stage ("שלב 2"), createdAt, updatedAt, viceApprover, handler (a route
 * type's assigned handler, by name), progress (a route type's progress bar, else null), requester {name, personalId,
 * phone}, values [{label, value, depth, section}], files [{name, url}], comments [{id, author, createdAt, text}].
 */
export async function fetchRequestDetails(row, signal) {
  const booking = await requesterApi.booking(row.id, signal);
  // booking_values is a tree (ShowBookingResource / BookingValueFormatterService): a field may hold sub-fields
  // (form_fields), chosen options (option_fields, each an ancestor chain down to the chosen one, which may carry a typed
  // value) or a plain value; upload fields hold their files. Flatten it into label/value rows, sub-fields indented;
  // each row keeps its section (the requester's details, or what the handlers filled during the route).
  const values = [];
  const attachments = Array.isArray(booking.attachments) ? booking.attachments : [];
  const legacyFiles = uploadAttachments(booking.booking_values);
  const walk = (item, depth, section) => {
    if (!item) return;
    const own = item.section ?? section;
    const label = item.field_display_name ?? item.field_name ?? '';
    if (Array.isArray(item.value) && item.value.some((entry) => entry?.type === 'file' || entry?.type === 'image')) {
      return;
    }
    if (item.form_fields?.length) {
      values.push({ label, value: null, depth, group: true, section: own });
      for (const child of item.form_fields) walk(child, depth + 1, own);
      return;
    }
    // the chosen option(s) by their display_name: one choice comes as an object, a multi-select as a list
    // (lib/booking-values optionText reads both, as the management side does)
    const chosen = optionText(item.option_fields);
    if (chosen) {
      values.push({ label, value: chosen, depth, section: own });
      return;
    }
    values.push({ label, value: item.value, depth, section: own });
  };
  for (const item of booking.booking_values ?? []) walk(item, 0, 'requester');

  return {
    statusId: booking.status?.id ?? row.statusId,
    statusName: topicStatusLabel(booking.status?.id ?? row.statusId, row.bookingTypeId) ?? booking.status?.display_name ?? row.statusName,
    statusMessage: booking.status?.additional_message ?? null,
    stage: booking.status?.stage ?? null,
    createdAt: booking.created_at ?? row.createdAt,
    updatedAt: booking.updated_at ?? null,
    viceApprover: booking.vice_approver?.user?.full_name ?? null,
    handler: booking.handler?.full_name ?? null,
    progress: Array.isArray(booking.progress) && booking.progress.length ? booking.progress : null,
    isCancelable: Boolean(booking.is_cancelable),
    requester: booking.user ? { name: booking.user.full_name ?? '', personalId: booking.user.personal_id ?? '', phone: booking.user.phone ?? '' } : null,
    values,
    // booking_values is the established source and still carries working URLs. The newer attachments URLs are a fallback.
    files: legacyFiles.length ? legacyFiles : attachments,
    comments: (booking.comments ?? []).map((comment) => ({
      id: comment.id,
      author: comment.user?.full_name || comment.user?.personal_id || '',
      createdAt: comment.created_at ?? '',
      text: comment.comment ?? '',
    })),
  };
}

/** The only status that waits for the requester (StatusBookingEnum::PENDING_FILE: "נדרשת השלמת קבצים מהלקוח"). */
const WAITING_FOR_USER = 8;
/** Completed (5), and the clearance granted (105: the successful end of the clearance grant's route). */
const COMPLETED_STATUS_IDS = [5, 105];

/**
 * Which home counter a request falls under: done, action (waits for the user), handling (open, with someone else),
 * or null (closed without completing: rejected or cancelled). "open" is action + handling.
 */
export function counterOf(row) {
  if (COMPLETED_STATUS_IDS.includes(row.statusId)) return 'done';
  if (row.statusId === WAITING_FOR_USER) return 'action';
  return OPEN_STATUS_IDS.includes(row.statusId) ? 'handling' : null;
}


/** A date from the requester endpoints as a local day: they send "d/m/Y" (day first); an ISO date also works. Null if unreadable. */
export function parseDay(value) {
  const text = String(value ?? '').trim();
  const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/.exec(text);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const date = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
}

/** Whole days from a date until today (0 = today); null if the date cannot be read. */
export function daysSince(value, today = new Date()) {
  const day = parseDay(value);
  if (!day) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((start - day) / 86_400_000));
}

/** "כבר 3 ימים" in Hebrew: today, a day, two days, N days. */
export function waitedLabel(days) {
  if (days === null || days === undefined) return '';
  if (days === 0) return 'מהיום';
  if (days === 1) return 'כבר יום';
  if (days === 2) return 'כבר יומיים';
  return `כבר ${days} ימים`;
}


/** The barber (BookingTypeEnum::BARBER_BOOKING) and the one domain whose route starts at the control officer (הובלות). */
const BARBER_TYPE_ID = 5;
const CONTROL_OFFICER_TYPE_IDS = [8];
/** The statuses that end a request badly (StatusBookingEnum::isTerminal, without the successful ends). */
export const isRejectedRequest = (statusId) => [4, 12, 16, 18].includes(Number(statusId));

const TERMINAL_STATUS_IDS = [4, 5, 6, 7, 12, 13, 105];

/**
 * Who or what a request is waiting for: the same answer as the API's Workflow::stageOf, which the management screens get
 * from the server (the requester endpoints do not send it). A type with a route of its own has its steps as its stages
 * (lib/routeTypes); the barber waits for the barber until it answers, and its approval (11) ends the route; every other
 * domain goes received → (רמ"ד תו"ב for הובלות) → גורם מטפל → מפקד תחום (or a supplier hold) → מימוש → closed.
 */
export function stageOf(statusId, bookingTypeId) {
  const routeStage = routeStageOf(statusId, bookingTypeId);
  if (routeStage) return routeStage;
  if (bookingTypeId === BARBER_TYPE_ID) return TERMINAL_STATUS_IDS.includes(statusId) || statusId === 11 ? 'closed' : 'barber';
  if (TERMINAL_STATUS_IDS.includes(statusId)) return 'closed';
  switch (statusId) {
    case 1:
      return CONTROL_OFFICER_TYPE_IDS.includes(bookingTypeId) ? 'control_officer' : 'vice_approver';
    case 14: case 17: case 18:
      return 'vice_approver';
    case 2: case 15: case 16:
      return 'approver';
    case 8:
      return 'supplier_files';
    case 9:
      return 'supplier_approval';
    case 10:
      return 'supplier_number';
    case 3:
      return 'realization';
    default:
      return 'closed';
  }
}

/** What routeFor needs to know of a domain (the management catalog, which a requester cannot read): the barber's and הובלות' statuses. */
const ROUTE_CATALOG = {
  booking_type_statuses: {
    [BARBER_TYPE_ID]: [1, 6, 11, 12, 13],
    ...Object.fromEntries(CONTROL_OFFICER_TYPE_IDS.map((id) => [id, [14, 17, 18]])),
  },
};

/**
 * A request's route, drawn exactly as the management screens draw it (features/bookings/route.js): the stations of its
 * domain, the station it is at, and how (here, hold, stopped, finished). A route type's own steps come from lib/routeTypes.
 */
export function requestRoute(statusId, bookingTypeId) {
  const booking = { booking_type_id: bookingTypeId, status_id: statusId, stage: stageOf(statusId, bookingTypeId) };
  const stations = routeFor(booking, ROUTE_CATALOG);
  const { here, mode } = routePosition(booking, stations);
  return { stage: booking.stage, stations, here, mode };
}
