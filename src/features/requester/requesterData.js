/**
 * Everything the regular-user home reads or sends, from the website API's requester endpoints:
 * GET /requester/catalog, GET /requester/form/{id}, GET /requester/counters, POST /bookings/{id},
 * GET /bookings/my-bookings and GET /bookings/{uuid}.
 */

import { OPEN_STATUS_IDS, requesterApi } from '@/lib/api/endpoints';
import { routeFor, routePosition } from '@/features/bookings/route';
import { domainIconSrc } from '@/lib/labels';

/** Files a form accepts as attachments (POST /bookings/{id}: jpg, jpeg, png, gif, webp, pdf; up to 10, 10 MB each). */
export const ATTACH_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** The colour picture of a topic or a request type (public/icons/requester), by its server name. */
const PICTURE = {
  infosec: 'infosec',
  ict: 'it',
  clearance_grant: 'clearance-grant',
  removable_media: 'removable-media',
  security_incident: 'security-incident',
  folder_permission: 'folder-permission',
  manta_permission: 'manta-permission',
  network_folder: 'network-folder',
};
export const iconSrc = (name) => (PICTURE[name] ? `/icons/requester/${PICTURE[name]}.svg` : null);

/**
 * GET /requester/catalog, shaped for the screens. The server already keeps only what the user may open
 * ("user_<id>" permission and the user's unit). Request types are identified by their booking type id.
 * - topics: [{ id (server name), name, img, groups: [{ id, name, types: [{ id, key, name, description, img }] }] }]
 * - categories: the topics and the plain domains, for "הקריאות שלי": [{ id, name, img, typeIds }]
 */
export async function fetchCatalog(signal) {
  const data = await requesterApi.catalog(signal);
  const byPosition = (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0);
  const topics = [...(data?.topics ?? [])].sort(byPosition).map((topic) => ({
    id: topic.name,
    name: topic.display_name,
    img: iconSrc(topic.name),
    groups: [...(topic.groups ?? [])].sort(byPosition).map((group) => ({
      id: group.id,
      name: group.display_name,
      types: [...(group.booking_types ?? [])].sort(byPosition).map((type) => ({
        id: type.id,
        key: type.name,
        name: type.display_name,
        description: type.description ?? '',
        img: iconSrc(type.name) ?? domainIconSrc(type.id),
      })),
    })),
  }));
  const domains = [...(data?.domains ?? [])].sort(byPosition);
  const categories = [
    ...topics.map((topic) => ({ id: topic.id, name: topic.name, img: topic.img, typeIds: topic.groups.flatMap((group) => group.types.map((type) => type.id)) })),
    ...domains.map((domain) => ({ id: `d${domain.id}`, name: domain.display_name, img: domainIconSrc(domain.id), typeIds: [domain.id] })),
  ];
  return { topics, categories };
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

/** How a server field type is drawn: the input's kind, and the HTML input type for plain inputs. */
const FIELD_KIND = {
  text: ['text', 'text'],
  text_box: ['text', 'text'],
  text_area: ['textarea'],
  tel: ['text', 'tel'],
  email: ['text', 'email'],
  url: ['text', 'url'],
  number: ['text', 'number'],
  number_with_asterisk: ['text', 'number'],
  date: ['text', 'date'],
  time: ['text', 'time'],
  month: ['text', 'month'],
  week: ['text', 'week'],
  select: ['select'],
  radio: ['select'],
};

/** A field as the form draws it; `regex` comes from the field's `validations`. */
function toField(raw) {
  const [kind, inputType] = FIELD_KIND[raw.field_type?.name] ?? ['text', 'text'];
  let regex = null;
  try {
    regex = raw.validations?.regex ? new RegExp(raw.validations.regex) : null;
  } catch {
    regex = null;
  }
  return {
    id: raw.id,
    label: raw.field_display_name ?? raw.field_name ?? '',
    kind,
    inputType,
    ltr: ['tel', 'email', 'url', 'number'].includes(inputType),
    required: Boolean(raw.is_required),
    regex,
    options: raw.options ?? [],
    children: [...(raw.children ?? [])].sort((a, b) => a.position - b.position).map(toField),
  };
}

/** GET /requester/form/{id}: the fields in order (the server filters them to the user's unit). Upload fields are left to the form's own attachments. */
export async function fetchForm(typeId, signal) {
  const data = await requesterApi.form(typeId, signal);
  return [...(data ?? [])]
    .filter((raw) => !['file', 'image', 'hidden'].includes(raw.field_type?.name))
    .sort((a, b) => a.position - b.position)
    .map(toField);
}

/**
 * Opens a request (POST /bookings/{id}, multipart): `values` maps field id → value (a select's value is its option id),
 * `files` are the attachments. Returns the new booking; a 422 carries per-field messages (`values.<id>`, `files.<n>`).
 */
export async function submitRequest(typeId, values, files) {
  const body = new FormData();
  for (const [fieldId, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') body.append(`values[${fieldId}]`, value);
  }
  for (const file of files) body.append('files[]', file);
  return requesterApi.create(typeId, body);
}

/** The four home counters (GET /requester/counters): open, action (waits for the user), handling, done. */
export async function fetchCounters(signal) {
  return requesterApi.counters(signal);
}

/** GET /bookings/my-bookings page size (PaginationEnum::PER_PAGE on the API), and how many pages to read at most (200 requests). */
const PAGE_SIZE = 20;
const MAX_PAGES = 10;

/**
 * The user's requests from GET /bookings/my-bookings (up to 200, newest first), limited to `typeIds` when given
 * (a category of "הקריאות שלי"). Row shape: id (uuid), typeName, bookingTypeId, serial, createdAt, updatedAt, statusId, statusName.
 */
export async function fetchMyRequests(typeIds, signal) {
  // the API sends 20 a page with no paging meta: a short page is the last one
  const bookings = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = (await requesterApi.myBookings(page, null, signal)).data ?? [];
    bookings.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return bookings
    .filter((booking) => !typeIds || typeIds.includes(booking.booking_type?.id))
    .map((booking) => ({
      id: booking.uuid,
      typeName: booking.booking_type?.display_name ?? '',
      bookingTypeId: booking.booking_type?.id,
      serial: booking.serial_number,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      statusId: booking.status?.id,
      statusName: booking.status?.display_name ?? '',
    }));
}

/**
 * One request in full, for the side panel, from GET /bookings/{uuid}.
 * Shape: statusId, statusName, statusMessage, createdAt, updatedAt, viceApprover, requester {name, personalId, phone},
 * values [{label, value, depth}], files [{name, url}], comments [{id, author, createdAt, text}].
 */
export async function fetchRequestDetails(row, signal) {
  const booking = await requesterApi.booking(row.id, signal);
  // booking_values is a tree (ShowBookingResource / BookingValueFormatterService): a field may hold sub-fields
  // (form_fields), chosen options (option_fields, each an ancestor chain down to the chosen one, which may carry a typed
  // value) or a plain value; upload fields hold their files. Flatten it into label/value rows, sub-fields indented.
  const values = [];
  const files = [];
  const optionText = (node) => {
    const chain = [];
    for (let cursor = node; cursor; cursor = cursor.option_fields?.[0]) {
      if (cursor.display_name) chain.push(cursor.display_name);
      if (cursor.value != null && cursor.value !== '') chain.push(String(cursor.value));
    }
    return chain.join(' › ');
  };
  const walk = (item, depth) => {
    if (!item) return;
    const label = item.field_display_name ?? item.field_name ?? '';
    if (Array.isArray(item.value) && item.value.some((entry) => entry?.type === 'file' || entry?.type === 'image')) {
      for (const entry of item.value) files.push({ name: entry.display_name ?? entry.name ?? 'קובץ', url: entry.url ?? null });
      return;
    }
    if (item.form_fields?.length) {
      values.push({ label, value: null, depth, group: true });
      for (const child of item.form_fields) walk(child, depth + 1);
      return;
    }
    if (item.option_fields?.length) {
      values.push({ label, value: item.option_fields.map(optionText).filter(Boolean).join(', '), depth });
      return;
    }
    values.push({ label, value: item.value, depth });
  };
  for (const item of booking.booking_values ?? []) walk(item, 0);

  return {
    statusId: booking.status?.id ?? row.statusId,
    statusName: booking.status?.display_name ?? row.statusName,
    statusMessage: booking.status?.additional_message ?? null,
    createdAt: booking.created_at ?? row.createdAt,
    updatedAt: booking.updated_at ?? null,
    viceApprover: booking.vice_approver?.user?.full_name ?? null,
    requester: booking.user ? { name: booking.user.full_name ?? '', personalId: booking.user.personal_id ?? '', phone: booking.user.phone ?? '' } : null,
    values,
    files,
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
const COMPLETED = 5;

/**
 * Which home counter a request falls under: done, action (waits for the user), handling (open, with someone else),
 * or null (closed without completing: rejected or cancelled). "open" is action + handling.
 */
export function counterOf(row) {
  if (row.statusId === COMPLETED) return 'done';
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
/** The statuses that end a request (StatusBookingEnum::isTerminal). */
const TERMINAL_STATUS_IDS = [4, 5, 6, 7, 12, 13];

/**
 * Who or what a request is waiting for: the same answer as the API's Workflow::stageOf, which the management screens get
 * from the server (the requester endpoints do not send it). The barber waits for the barber until it answers, and its
 * approval (11) ends the route; every other domain goes received → (רמ"ד תו"ב for הובלות) → גורם מטפל → מפקד תחום
 * (or a supplier hold) → מימוש → closed.
 */
export function stageOf(statusId, bookingTypeId) {
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
 * domain, the station it is at, and how (here, hold, stopped, finished).
 */
export function requestRoute(statusId, bookingTypeId) {
  const booking = { booking_type_id: bookingTypeId, status_id: statusId, stage: stageOf(statusId, bookingTypeId) };
  const stations = routeFor(booking, ROUTE_CATALOG);
  const { here, mode } = routePosition(booking, stations);
  return { stage: booking.stage, stations, here, mode };
}
