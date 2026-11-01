import type { BookingAction, ChangeSource, StageId } from './api/types';

/**
 * Hebrew wording and colours shared by the screens. Wording follows the finished example UI
 * ("קריאות" - not "בקשות"; the audit log is "היסטוריית שינויים"). The palette is the client palette:
 * Vintage Grape 3D314A, Pine Blue 307473, Mauve Shadow 684756, Bone DDDBCB, Emerald Depths 12664F.
 */

/** The order of the approval route; used wherever stages are listed. */
export const STAGE_ORDER: StageId[] = [
  'control_officer',
  'vice_approver',
  'approver',
  'supplier_files',
  'supplier_approval',
  'supplier_number',
  'realization',
  'barber_done',
];

export const STAGE_SHORT: Record<StageId, string> = {
  control_officer: 'רמ"ד תו"ב',
  vice_approver: 'גורם מטפל',
  approver: 'מפקד תחום',
  supplier_files: 'קבצים מהלקוח',
  supplier_approval: 'אישור ספק',
  supplier_number: 'מספר ספק',
  realization: 'מימוש וסגירה',
  barber_done: 'אחרי ספר',
  closed: 'סגורה',
};

/** Stage colours follow the route: early stages mauve, approval pine, supplier waits bone, realisation emerald. */
export const STAGE_COLOR: Record<StageId, string> = {
  control_officer: '#684756',
  vice_approver: '#9C7F8C',
  approver: '#307473',
  supplier_files: '#CFCBB3',
  supplier_approval: '#B7B39C',
  supplier_number: '#9E9A80',
  realization: '#12664F',
  barber_done: '#5C9C8D',
  closed: '#9E9A80',
};

export const WAIT_LABEL: Record<string, string> = {
  approval: 'החלטה פנימית',
  customer_info: 'השלמת מידע מהמבקש',
  supplier: 'ספק חיצוני',
  realization: 'מימוש ההזמנה',
};

/** Role names (Spatie) -> what people call them. Used to label chips only, never to decide anything. */
export const ROLE_NAME: Record<string, string> = {
  super_admin: 'מנהל מערכת',
  admin: 'מפקד מחנה',
  approver: 'מפקד תחום',
  vice_approver: 'גורם מטפל',
  transportation_control_officer: 'רמ"ד תו"ב',
  user: 'משתמש',
};

/** Who made a status change / an audit row. */
export const SOURCE_LABEL: Record<string, { label: string; tone: 'ext' | 'int' | 'sys' }> = {
  external: { label: 'אפליקציה', tone: 'ext' },
  internal: { label: 'פנימית', tone: 'int' },
  system: { label: 'אוטומטי', tone: 'sys' },
  automation: { label: 'אוטומטי', tone: 'sys' },
};

export function sourceTag(source: ChangeSource | string | null | undefined) {
  return source ? SOURCE_LABEL[source] : undefined;
}

/** One colour per service domain - badges, ticket edges and charts (colour is never the only carrier of meaning). */
const DOMAIN_COLOR: Record<number, string> = {
  1: '#3D314A',
  2: '#5A4C66',
  3: '#684756',
  4: '#8A6A79',
  5: '#7A5A68',
  8: '#12664F',
  10: '#307473',
  11: '#3E8A88',
  13: '#5B5446',
};

export const domainColor = (bookingTypeId: number): string => DOMAIN_COLOR[bookingTypeId] ?? '#64748b';

/** Domains that have an illustration in /public/icons/domains (the external system's own icons). */
const DOMAIN_ICONS = new Set([1, 2, 3, 4, 5, 8, 10, 11, 13]);
export const domainIconSrc = (bookingTypeId: number): string | null => (DOMAIN_ICONS.has(bookingTypeId) ? `/icons/domains/${bookingTypeId}.svg` : null);

/** Colour class of a status chip. Status numbers are shared with the mobile app, so they are stable. */
export type ChipTone = 'ok' | 'bad' | 'hold' | 'acc' | 'warn' | 'info' | '';

export function statusTone(statusId: number): ChipTone {
  if (statusId === 5) return 'ok';
  if ([4, 6, 7, 12, 13, 16, 18].includes(statusId)) return 'bad';
  if ([8, 9, 10].includes(statusId)) return 'hold';
  if ([3, 11, 15, 17].includes(statusId)) return 'acc';
  return 'warn';
}

/** A destructive decision (reject / cancel) is drawn red, a supplier wait purple, everything else as the main action. */
export function actionTone(action: Pick<BookingAction, 'status_id'>): 'danger' | 'hold' | 'primary' {
  if ([4, 7, 16, 18].includes(action.status_id)) return 'danger';
  if ([8, 9, 10].includes(action.status_id)) return 'hold';
  return 'primary';
}

/** Field-type ids that carry a list of options (select, radio, checkbox, multi-select). */
export const OPTION_FIELD_TYPES = [5, 8, 14, 20];
/** Only a date or a time can be corrected by an approver. */
export const EDITABLE_FIELD_TYPES = [3, 4];
export const FIELD_TYPE_DATE = 3;
export const FIELD_TYPE_TIME = 4;

/** The comment rule the server enforces on a status change: Hebrew letters and spaces, at most 100 characters. */
export const COMMENT_MAX = 100;
export const COMMENT_PATTERN = /^[א-ת ]+$/u;

export function commentError(comment: string, required: boolean): string | null {
  const text = comment.trim();
  if (!text) return required ? 'יש לצרף הערה לביצוע פעולה זו' : null;
  if (text.length > COMMENT_MAX) return `ההערה יכולה להכיל עד ${COMMENT_MAX} תווים`;
  if (!COMMENT_PATTERN.test(text)) return 'ההערה יכולה להכיל אותיות בעברית ורווחים בלבד';
  return null;
}
