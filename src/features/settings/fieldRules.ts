import type { FieldType, FormField } from '@/lib/api/types';

/** Mirrors the server's text rules (FormFieldRules / UpdateOptionFieldRequest); the server has the final say. */

export const FIELD_NAME_MIN = 2;
export const FIELD_NAME_MAX = 50;
export const OPTION_NAME_MAX = 50;
export const OPTIONS_MAX = 100;

/** Hebrew letters (and Hebrew punctuation), Latin letters, digits, spaces and basic punctuation. */
const FIELD_NAME_PATTERN = /^[\p{Script=Hebrew}a-zA-Z0-9\s"'\-(),./]+$/u;
/** Same, but the Hebrew letters only and no slash. */
const OPTION_NAME_PATTERN = /^[a-zA-Z0-9א-ת\s"',.\-()]+$/u;

/** Case-insensitive comparison key: the server compares names without regard to case or surrounding spaces. */
export const nameKey = (name: string): string => name.trim().toLocaleLowerCase('he');

/** Error for a field name, or null. `others` excludes the field being edited. */
export function fieldNameError(name: string, others: readonly Pick<FormField, 'field_display_name'>[]): string | null {
  const text = name.trim();
  if (text.length < FIELD_NAME_MIN || text.length > FIELD_NAME_MAX) return `שם השדה חייב להכיל בין ${FIELD_NAME_MIN} ל-${FIELD_NAME_MAX} תווים`;
  if (!FIELD_NAME_PATTERN.test(text)) return 'שם השדה יכול להכיל אותיות, ספרות וסימני פיסוק בסיסיים בלבד';
  if (others.some((other) => nameKey(other.field_display_name) === nameKey(text))) return 'כבר קיים שדה בשם זה בטופס';
  return null;
}

/** One option per line: trimmed, the empty lines dropped. */
export function parseOptionLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Error for an option name among its siblings (same parent, itself excluded), or null. */
export function optionNameError(name: string, siblings: readonly string[]): string | null {
  const text = name.trim();
  if (!text) return 'יש להזין שם לאפשרות';
  if (text.length > OPTION_NAME_MAX) return `שם אפשרות יכול להכיל עד ${OPTION_NAME_MAX} תווים`;
  if (!OPTION_NAME_PATTERN.test(text)) return 'שם אפשרות יכול להכיל אותיות, ספרות ורווחים וסימנים בסיסיים בלבד (בלי לוכסן)';
  if (siblings.some((sibling) => nameKey(sibling) === nameKey(text))) return 'כבר קיימת אפשרות בשם זה';
  return null;
}

/** The error for the options of a new choice field - at least one, none twice, each a plain name - or null. */
export function newOptionsError(options: readonly string[]): string | null {
  if (options.length === 0) return 'שדה בחירה חייב לכלול לפחות אפשרות אחת';
  if (options.length > OPTIONS_MAX) return `אפשר להזין עד ${OPTIONS_MAX} אפשרויות`;
  if (new Set(options.map(nameKey)).size !== options.length) return 'קיימות אפשרויות כפולות';
  for (const option of options) {
    if (option.length > OPTION_NAME_MAX || !OPTION_NAME_PATTERN.test(option)) {
      return `שם אפשרות אינו תקין: "${option}" (עד ${OPTION_NAME_MAX} תווים, אותיות, ספרות וסימנים בסיסיים)`;
    }
  }
  return null;
}

/** Hebrew name of a field type; types a new field cannot have use a fallback. */
const FALLBACK_TYPE_NAME: Record<number, string> = {
  12: 'סיסמה',
  15: 'שדה מוסתר',
  16: 'צבע',
  17: 'טווח',
  18: 'חודש',
  19: 'שבוע',
  22: 'מספר עם כוכבית',
};

export function fieldTypeName(fieldTypeId: number, fieldTypes: readonly Pick<FieldType, 'id' | 'display_name'>[]): string {
  return fieldTypes.find((type) => type.id === fieldTypeId)?.display_name ?? FALLBACK_TYPE_NAME[fieldTypeId] ?? `סוג ${fieldTypeId}`;
}

/** Types a field may change to: the server keeps choice fields and plain fields in their own family. */
export function retypeChoices(fieldTypes: readonly FieldType[], current: Pick<FieldType, 'has_options'> | undefined): FieldType[] {
  return fieldTypes.filter((type) => !current || type.has_options === current.has_options);
}
