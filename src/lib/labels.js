

/** Approval route order. */
export const STAGE_ORDER = [
  'control_officer',
  'vice_approver',
  'approver',
  'supplier_files',
  'supplier_approval',
  'supplier_number',
  'barber',
  'realization',
];

export const STAGE_SHORT = {
  topic_handler: 'בטיפול',
  control_officer: 'רמ"ד תו"ב',
  vice_approver: 'גורם מטפל',
  approver: 'מפקד תחום',
  supplier_files: 'קבצים מהלקוח',
  supplier_approval: 'אישור ספק',
  supplier_number: 'מספר ספק',
  realization: 'מימוש וסגירה',
  barber: 'ממתין לספר',
  closed: 'סגורה',
  // the clearance grant's own route (lib/routeTypes): assignment, the interview set, held, the clearance awaited
  interview_assignment: 'הקצאה לתחקיר',
  interview_scheduled: 'נקבע מול המועמד',
  interviewed: 'תוחקר',
  awaiting_clearance: 'ממתין לקבלת הכשר',
};

/** One colour per stage for the dashboard charts. */
export const STAGE_COLOR = {
  topic_handler: '#1F8E8B',
  control_officer: '#8C3F68',
  vice_approver: '#C46A9B',
  approver: '#1F8E8B',
  supplier_files: '#AD903F',
  supplier_approval: '#D9962F',
  supplier_number: '#C0782A',
  realization: '#14915F',
  barber: '#39828C',
  closed: '#8A8296',
  interview_assignment: '#8C3F68',
  interview_scheduled: '#39828C',
  interviewed: '#AD903F',
  awaiting_clearance: '#1F8E8B',
};

export const WAIT_LABEL = {
  approval: 'החלטה פנימית',
  customer_info: 'השלמת מידע מהמבקש',
  supplier: 'ספק חיצוני',
  realization: 'מימוש ההזמנה',
};

/** Display names for roles; labels only. */
export const ROLE_NAME = {
  super_admin: 'מנהל מערכת',
  admin: 'מפקד מחנה',
  approver: 'מפקד תחום',
  vice_approver: 'גורם מטפל',
  transportation_control_officer: 'רמ"ד תו"ב',
  // the ביטחון מידע and תקשוב handlers (RoleEnum on the API)
  infosec_officer: 'קצין ביטחון מידע',
  ict_handler: 'מנהל תקשוב',
  // the clearance grant's route (lib/routeTypes): the one who submits and the one who schedules the interview
  department_security_officer: 'קב"ט מחלקתי',
  interview_coordinator: 'מתאם תחקיר',
  user: 'משתמש',
};

export const SOURCE_LABEL = {
  external: { label: 'אפליקציה', tone: 'ext' },
  internal: { label: 'פנימית', tone: 'int' },
  // a request submitted on this website's requester portal
  web: { label: 'אתר', tone: 'int' },
  system: { label: 'אוטומטי', tone: 'sys' },
  automation: { label: 'אוטומטי', tone: 'sys' },
};

export function sourceTag(source) {
  return source ? SOURCE_LABEL[source] : undefined;
}

/** One colour per service domain (the stripe beside a booking, a tile's hover border), from the app's muted palette. */
const DOMAIN_COLOR = {
  1: '#3D314A',
  2: '#6B4552',
  3: '#2E7470',
  4: '#A07D8C',
  5: '#6E5F7D',
  8: '#145E4A',
  10: '#948E72',
  11: '#5E8C7E',
  13: '#8A8296',
};

export const domainColor = (bookingTypeId) => DOMAIN_COLOR[bookingTypeId] ?? '#8A8296';

/** Domains with an illustration in /public/icons/domains. */
const DOMAIN_ICONS = new Set([1, 2, 3, 4, 5, 8, 10, 11, 13]);
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
export const requesterIconSrc = (name) => (PICTURE[name] ? `/icons/requester/${PICTURE[name]}.svg` : null);

const REQUEST_TYPE_NAMES = {
  14: 'clearance_grant',
  15: 'removable_media',
  16: 'security_incident',
  17: 'folder_permission',
  18: 'manta_permission',
  19: 'network_folder',
};

export function domainIconSrc(bookingTypeId, name = REQUEST_TYPE_NAMES[bookingTypeId]) {
  return requesterIconSrc(name) ?? (DOMAIN_ICONS.has(bookingTypeId) ? `/icons/domains/${bookingTypeId}.svg` : null);
}



export function statusTone(statusId) {
  // 105: the clearance grant's successful end (lib/routeTypes)
  if ([5, 105].includes(statusId)) return 'ok';
  if ([4, 6, 7, 12, 13, 16, 18].includes(statusId)) return 'bad';
  if ([8, 9, 10].includes(statusId)) return 'hold';
  // 102-104: the interview is set, held, the clearance awaited
  if ([3, 11, 15, 17, 102, 103, 104].includes(statusId)) return 'acc';
  return 'warn';
}

/**
 * Reject / cancel are destructive, supplier waits are "hold", a move back along a route is "secondary" (a plain button),
 * the rest are primary. A route's action says its `direction` (forward | back | close | reject); a generic one is
 * known by the status it leads to.
 */
export function actionTone(action) {
  if ([4, 7, 12, 16, 18].includes(action.status_id) || action.direction === 'reject') return 'danger';
  if ([8, 9, 10].includes(action.status_id)) return 'hold';
  if (action.direction === 'back') return 'secondary';
  return 'primary';
}

/** The Button variant of an action's tone. */
export function actionVariant(action) {
  return { danger: 'danger', hold: 'hold', secondary: 'default' }[actionTone(action)] ?? 'primary';
}

/** Field types with options: select, radio, checkbox, multi-select. */
export const OPTION_FIELD_TYPES = [5, 8, 14, 20];
/** Approvers may correct only dates and times. */
export const EDITABLE_FIELD_TYPES = [3, 4];
export const FIELD_TYPE_DATE = 3;
export const FIELD_TYPE_TIME = 4;

/** Server rule for status-change comments: Hebrew letters and spaces, max 100 characters. */
export const COMMENT_MAX = 100;
export const COMMENT_PATTERN = /^[א-ת ]+$/u;

export function commentError(comment, required) {
  const text = comment.trim();
  if (!text) return required ? 'יש לצרף הערה לביצוע פעולה זו' : null;
  if (text.length > COMMENT_MAX) return `ההערה יכולה להכיל עד ${COMMENT_MAX} תווים`;
  if (!COMMENT_PATTERN.test(text)) return 'ההערה יכולה להכיל אותיות בעברית ורווחים בלבד';
  return null;
}

export const STAGE_FILTER_ORDER = ['barber', ...STAGE_ORDER.filter((stage) => stage !== 'barber')];

/** Departments are hidden in the console for now; flip to true to show them again (data and API are untouched). */
export const SHOW_DEPARTMENTS = false;
