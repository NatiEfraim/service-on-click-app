import type { BookingAction, ChangeSource, StageId } from './api/types';

/** Approval route order. */
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

/** One distinct hue per stage, in stage order (a colour-blind-checked categorical set: neighbours never share a hue family). */
export const STAGE_COLOR: Record<StageId, string> = {
  control_officer: '#2A78D6',
  vice_approver: '#EB6834',
  approver: '#1BAF7A',
  supplier_files: '#EDA100',
  supplier_approval: '#E87BA4',
  supplier_number: '#008300',
  realization: '#6250D6',
  barber_done: '#E34948',
  closed: '#64748B',
};

export const WAIT_LABEL: Record<string, string> = {
  approval: 'החלטה פנימית',
  customer_info: 'השלמת מידע מהמבקש',
  supplier: 'ספק חיצוני',
  realization: 'מימוש ההזמנה',
};

/** Display names for roles; labels only. */
export const ROLE_NAME: Record<string, string> = {
  super_admin: 'מנהל מערכת',
  admin: 'מפקד מחנה',
  approver: 'מפקד תחום',
  vice_approver: 'גורם מטפל',
  transportation_control_officer: 'רמ"ד תו"ב',
  user: 'משתמש',
};

export const SOURCE_LABEL: Record<string, { label: string; tone: 'ext' | 'int' | 'sys' }> = {
  external: { label: 'אפליקציה', tone: 'ext' },
  internal: { label: 'פנימית', tone: 'int' },
  system: { label: 'אוטומטי', tone: 'sys' },
  automation: { label: 'אוטומטי', tone: 'sys' },
};

export function sourceTag(source: ChangeSource | string | null | undefined) {
  return source ? SOURCE_LABEL[source] : undefined;
}

/** One colour per service domain. */
const DOMAIN_COLOR: Record<number, string> = {
  1: '#1E40AF',
  2: '#3B82F6',
  3: '#6366F1',
  4: '#8B5CF6',
  5: '#7C3AED',
  8: '#0E7490',
  10: '#0EA5E9',
  11: '#457B9D',
  13: '#52637A',
};

export const domainColor = (bookingTypeId: number): string => DOMAIN_COLOR[bookingTypeId] ?? '#64748b';

/** Domains with an illustration in /public/icons/domains. */
const DOMAIN_ICONS = new Set([1, 2, 3, 4, 5, 8, 10, 11, 13]);
export const domainIconSrc = (bookingTypeId: number): string | null => (DOMAIN_ICONS.has(bookingTypeId) ? `/icons/domains/${bookingTypeId}.svg` : null);

/** Chip tone per status id (ids are shared with the mobile app). */
export type ChipTone = 'ok' | 'bad' | 'hold' | 'acc' | 'warn' | 'info' | '';

export function statusTone(statusId: number): ChipTone {
  if (statusId === 5) return 'ok';
  if ([4, 6, 7, 12, 13, 16, 18].includes(statusId)) return 'bad';
  if ([8, 9, 10].includes(statusId)) return 'hold';
  if ([3, 11, 15, 17].includes(statusId)) return 'acc';
  return 'warn';
}

/** Reject / cancel are destructive, supplier waits are "hold", the rest are primary. */
export function actionTone(action: Pick<BookingAction, 'status_id'>): 'danger' | 'hold' | 'primary' {
  if ([4, 7, 16, 18].includes(action.status_id)) return 'danger';
  if ([8, 9, 10].includes(action.status_id)) return 'hold';
  return 'primary';
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

export function commentError(comment: string, required: boolean): string | null {
  const text = comment.trim();
  if (!text) return required ? 'יש לצרף הערה לביצוע פעולה זו' : null;
  if (text.length > COMMENT_MAX) return `ההערה יכולה להכיל עד ${COMMENT_MAX} תווים`;
  if (!COMMENT_PATTERN.test(text)) return 'ההערה יכולה להכיל אותיות בעברית ורווחים בלבד';
  return null;
}
