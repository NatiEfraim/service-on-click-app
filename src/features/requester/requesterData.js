/**
 * Everything the regular-user home reads or sends. The backend for it does not exist yet, so this runs on demo data;
 * when the API is ready, only this file changes (same function names, same shapes).
 */

import { requesterApi } from '@/lib/api/endpoints';
import { domainIconSrc } from '@/lib/labels';

/** Topics → groups → request types. `icon` is a name from components/ui/Icon. */
export const TOPICS = [
  {
    id: 'infosec',
    name: 'ביטחון מידע',
    icon: 'shield',
    groups: [
      {
        id: 'clearance',
        name: 'סיווג ביטחוני',
        types: [{ id: 'clearance-grant', name: 'מתן סיווג ביטחוני', icon: 'shield', description: 'בקשה לקבלת סיווג ביטחוני או העלאת רמת סיווג' }],
      },
      {
        id: 'datasec',
        name: 'אבטחת מידע',
        types: [
          { id: 'removable-media', name: 'אישור הכנסת מדיה נתיקה', icon: 'download', description: 'אישור להכנסת התקן אחסון נייד לרשת' },
          { id: 'security-incident', name: 'דיווח על אירוע ביטחון מידע', icon: 'alert', description: 'דיווח על חשד לאירוע או חשיפת מידע' },
        ],
      },
    ],
  },
  {
    id: 'it',
    name: 'תקשוב',
    icon: 'layers',
    groups: [
      {
        id: 'permissions',
        name: 'הרשאות',
        types: [
          { id: 'folder-permission', name: 'הרשאות לתיקייה', icon: 'file', description: 'הוספה או שינוי של הרשאות לתיקייה קיימת' },
          { id: 'manta-permission', name: 'הרשאות למנת"ה', icon: 'users', description: 'בקשת הרשאה למערכת מנת"ה' },
          { id: 'network-folder', name: 'יצירת תיקיית רשת', icon: 'building', description: 'פתיחת תיקייה משותפת חדשה ברשת' },
        ],
      },
    ],
  },
];

const PHONE = { pattern: /^05\d{8}$/, message: 'מספר טלפון נייד בן 10 ספרות, מתחיל ב-05' };
const PERSONAL = { pattern: /^\d{5,9}$/, message: 'מספר אישי: 5 עד 9 ספרות' };

/** The fields of each form. kind: text | textarea | select | date | number. */
export const FORMS = {
  'clearance-grant': [
    { id: 'role', label: 'תפקיד', kind: 'text', required: true },
    { id: 'level', label: 'רמת סיווג מבוקשת', kind: 'select', required: true, options: ['שמור', 'סודי', 'סודי ביותר'] },
    { id: 'reason', label: 'נימוק הבקשה', kind: 'textarea', required: true },
    { id: 'phone', label: 'טלפון לתיאום', kind: 'text', required: true, placeholder: '05XXXXXXXX', ltr: true, ...PHONE },
  ],
  'removable-media': [
    { id: 'media', label: 'סוג המדיה', kind: 'select', required: true, options: ['דיסק און קי', 'כונן חיצוני', 'תקליטור', 'כרטיס זיכרון'] },
    { id: 'serial', label: 'מספר סידורי של ההתקן', kind: 'text', required: true, ltr: true },
    { id: 'purpose', label: 'מטרת השימוש', kind: 'textarea', required: true },
    { id: 'until', label: 'נדרש עד תאריך', kind: 'date' },
  ],
  'security-incident': [
    { id: 'date', label: 'תאריך האירוע', kind: 'date', required: true },
    { id: 'description', label: 'תיאור האירוע', kind: 'textarea', required: true },
    { id: 'location', label: 'מיקום', kind: 'text' },
  ],
  'folder-permission': [
    { id: 'path', label: 'נתיב התיקייה', kind: 'text', required: true, ltr: true },
    { id: 'access', label: 'סוג ההרשאה', kind: 'select', required: true, options: ['קריאה', 'קריאה וכתיבה', 'שליטה מלאה'] },
    { id: 'grantee', label: 'מספר אישי של מקבל ההרשאה', kind: 'text', required: true, ltr: true, ...PERSONAL },
    { id: 'justification', label: 'הצדקה', kind: 'textarea', required: true },
    { id: 'until', label: 'בתוקף עד', kind: 'date' },
  ],
  'manta-permission': [
    { id: 'profile', label: 'פרופיל מבוקש', kind: 'select', required: true, options: ['צופה', 'משתמש', 'מנהל'] },
    { id: 'grantee', label: 'מספר אישי של מקבל ההרשאה', kind: 'text', required: true, ltr: true, ...PERSONAL },
    { id: 'justification', label: 'הצדקה', kind: 'textarea', required: true },
  ],
  'network-folder': [
    { id: 'name', label: 'שם התיקייה', kind: 'text', required: true },
    { id: 'location', label: 'מיקום (שרת או נתיב אב)', kind: 'text', required: true, ltr: true },
    { id: 'owners', label: 'בעלי התיקייה (מספרים אישיים)', kind: 'textarea', required: true },
    { id: 'size', label: 'נפח משוער (GB)', kind: 'number' },
  ],
};

/** Files a form accepts as attachments. */
export const ATTACH_ACCEPT = 'image/*,application/pdf';

/** The colour picture of a topic or a request type (public/icons/requester). */
export const iconSrc = (id) => `/icons/requester/${id}.svg`;

/** The type with its topic and group, for breadcrumbs; null when unknown. */
export function findType(typeId) {
  for (const topic of TOPICS) {
    for (const group of topic.groups) {
      const type = group.types.find((candidate) => candidate.id === typeId);
      if (type) return { topic, group, type };
    }
  }
  return null;
}

/**
 * The mobile app's service domains (booking_types, ids from the API's BookingTypeSeeder). Listed here because the API's
 * domain catalog is management-only; any user may open a request in any of them, as in the mobile app.
 */
export const DOMAINS = [
  { id: 1, name: 'רכב שיתופי' },
  { id: 2, name: 'תיאום שינוע רכב לטיפול' },
  { id: 3, name: 'ציוד גברים' },
  { id: 4, name: 'ציוד נשים' },
  { id: 5, name: 'מספרה' },
  { id: 8, name: 'הובלות' },
  { id: 10, name: 'מזון מחוץ ליחידה' },
  { id: 11, name: 'מזון בתוך היחידה' },
  { id: 13, name: 'בינוי' },
];

/** The permission that lets a user open requests in a domain (PermissionEnum::USER on the API): "user_<booking type id>". */
const USER_PERMISSION = /^user_(\d+)$/;

/**
 * Categories the user may open requests in: the new topics (their picture from public/icons/requester), then the
 * service domains the user holds "user_<id>" for in GET /user's permissions, the same check the mobile app's home makes
 * (its unit filter is not available to a plain user here). Domains get their own icon and `bookingTypeId`; ids are
 * strings so they can sit in the URL.
 */
export async function fetchPermittedCategories(signal) {
  const user = await requesterApi.user(signal);
  const allowed = new Set((user?.permissions ?? []).map((permission) => Number(USER_PERMISSION.exec(permission?.name ?? '')?.[1])).filter(Boolean));
  return [
    ...TOPICS.map((topic) => ({ id: topic.id, name: topic.name, img: iconSrc(topic.id) })),
    ...DOMAINS.filter((domain) => allowed.has(domain.id)).map((domain) => ({ id: `d${domain.id}`, name: domain.name, img: domainIconSrc(domain.id), bookingTypeId: domain.id })),
  ];
}

/** The user's requests in the new topics (demo store, kept for this browser session). */
let demoRequests = [];
let nextSerial = 1001;

/**
 * The user's requests in one category (null: all): the demo topic requests, and the real requests of the service domains
 * from GET /bookings/my-bookings (up to 200, newest first). One row shape: id, typeName, serial, createdAt, and
 * either `status` (demo: action | handling | done) or `statusId` + `statusName` (real).
 */
/** GET /bookings/my-bookings page size (PaginationEnum::PER_PAGE on the API), and how many pages to read at most (200 requests). */
const PAGE_SIZE = 20;
const MAX_PAGES = 10;

export async function fetchMyRequests(categoryId, signal) {
  const demo = demoRequests.filter((request) => !categoryId || request.topicId === categoryId);
  const domainId = categoryId?.startsWith('d') ? Number(categoryId.slice(1)) : null;
  if (categoryId && !domainId) return demo;
  // GET /bookings/my-bookings sends 20 a page with no paging meta: a short page is the last one
  const bookings = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = (await requesterApi.myBookings(page, null, signal)).data ?? [];
    bookings.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  const real = bookings
    .filter((booking) => !domainId || booking.booking_type?.id === domainId)
    .map((booking) => ({
      id: booking.uuid,
      typeName: booking.booking_type?.display_name ?? '',
      bookingTypeId: booking.booking_type?.id,
      serial: booking.serial_number,
      createdAt: booking.created_at,
      statusId: booking.status?.id,
      statusName: booking.status?.display_name ?? '',
    }));
  return [...(domainId ? [] : demo), ...real];
}

/**
 * One request in full, for the side panel: a real one from GET /bookings/{uuid}, a demo one from what was filled in.
 * Shape: statusId, statusName, statusMessage, createdAt, updatedAt, viceApprover, requester {name, personalId, phone},
 * values [{label, value, depth}], files [{name, url}], comments [{id, author, createdAt, text}].
 */
export async function fetchRequestDetails(row, signal) {
  if (row.status) {
    const fields = FORMS[row.typeId] ?? [];
    return {
      statusId: null,
      statusName: STATUS_LABEL[row.status],
      createdAt: row.createdAt,
      updatedAt: null,
      viceApprover: null,
      values: fields.filter((field) => row.values?.[field.id]).map((field) => ({ label: field.label, value: row.values[field.id] })),
      files: (row.files ?? []).map((name) => ({ name, url: null })),
      comments: [],
      requester: null,
      statusMessage: null,
    };
  }
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

/** The four counters on the home. */
export async function fetchCounters() {
  const count = (status) => demoRequests.filter((request) => request.status === status).length;
  const done = count('done');
  return { open: demoRequests.length - done, action: count('action'), handling: count('handling'), done };
}

/** Sends a request. `values` holds the field values, `files` the attachments. */
export async function submitRequest(typeId, values, files) {
  const found = findType(typeId);
  if (!found) throw new Error('סוג הקריאה אינו מוכר.');
  const request = {
    id: nextSerial,
    serial: String(nextSerial++),
    typeId,
    typeName: found.type.name,
    topicId: found.topic.id,
    status: 'handling',
    createdAt: new Date().toLocaleDateString('he-IL'),
    values,
    files: files.map((file) => file.name),
  };
  demoRequests = [request, ...demoRequests];
  return request;
}

export const STATUS_LABEL = { action: 'נדרשת פעולה ממך', handling: 'בטיפול', done: 'הושלמה' };

/** The four steps a request goes through, as the requester sees them. */
export const PROGRESS_STEPS = ['נשלחה', 'בטיפול', 'אושרה', 'הושלמה'];

/**
 * Where a request stands, from its status (StatusBookingEnum on the API): the step it is at and how (here: waiting there,
 * hold: waiting for something, stopped: rejected or cancelled, finished: done). Demo requests use their own status.
 */
export function requestProgress(statusId, demoStatus) {
  if (demoStatus) return demoStatus === 'done' ? { step: 3, mode: 'finished' } : { step: 1, mode: demoStatus === 'action' ? 'hold' : 'here' };
  switch (statusId) {
    case 1: // received
      return { step: 0, mode: 'here' };
    case 2: // processing
    case 14: // with the control officer
    case 15: // vice approver approved
    case 16: // vice approver rejected (back to the approver)
    case 17: // control officer approved
      return { step: 1, mode: 'here' };
    case 8: // waiting for a file
    case 9: // waiting during processing
      return { step: 1, mode: 'hold' };
    case 3: // approved
    case 11: // approved by the barber
      return { step: 2, mode: 'here' };
    case 10: // waiting after approval
      return { step: 2, mode: 'hold' };
    case 5: // completed
      return { step: 3, mode: 'finished' };
    case 4: // rejected
    case 7: // cancelled by the approver
    case 12: // cancelled by the barber
    case 18: // rejected by the control officer
      return { step: 1, mode: 'stopped' };
    case 6: // cancelled by the user
    case 13: // cancelled by a change of time
      return { step: 0, mode: 'stopped' };
    default:
      return { step: 0, mode: 'here' };
  }
}
