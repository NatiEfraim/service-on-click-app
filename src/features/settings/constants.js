/** The tabs of a domain's settings, in order; `form` is for the system admin only. */
export const TABS = [
  { id: 'form', label: 'מבנה הטופס' },
  { id: 'target', label: 'יעד טיפול' },
  { id: 'refs', label: 'הגדרות תפעול' },
  { id: 'dates', label: 'תאריכים חסומים' },
  { id: 'barber', label: 'ימי מספרה' },
  { id: 'options', label: 'אפשרויות בחירה' },
  { id: 'statement', label: 'הצהרה' },
];

/** Keyboard help read when a form field's drag handle gets focus. */
export const DRAG_INSTRUCTIONS = {
  draggable: 'כדי להזיז שדה: לחצו על רווח או Enter להרמה, השתמשו בחצים למעלה ולמטה להזזה, ולחצו שוב על רווח או Enter להצבה. Escape מבטל.',
};

/** Options shown per field in the form preview before "ועוד N". */
export const PREVIEW_MAX_CHIPS = 8;

/** Option field types, as in the mobile app: "הזנת ערך" is a number or closed text; a choice may be any type but a number. */
export const FIELD_TYPE_NUMBER = 1;
export const FIELD_TYPE_TEXT = 2;
export const INPUT_TYPES = [FIELD_TYPE_NUMBER, FIELD_TYPE_TEXT];
