/** Mirrors the server's `OrgRules` (with its Hebrew texts) for unit and department names. */

export const NAME_MIN = 2;
export const NAME_MAX = 40;
export const CODE_MAX = 3;

export const CODE_ERROR = 'האות של היחידה חייבת להיות 1 עד 3 אותיות באנגלית';
export const NAME_LENGTH_ERROR = `השם חייב להכיל בין ${NAME_MIN} ל-${NAME_MAX} תווים`;
export const NAME_CHARS_ERROR = 'השם יכול להכיל אותיות, ספרות וסימנים בסיסיים בלבד';

const CODE = /^[A-Za-z]{1,3}$/;
const NAME_CHARS = /^[\p{Script=Hebrew}a-zA-Z0-9\s"'\-./]+$/u;

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export function nameError(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return NAME_LENGTH_ERROR;
  if (!NAME_CHARS.test(name)) return NAME_CHARS_ERROR;
  return null;
}

/** The letters of a unit code as typed: English letters only, upper case, at most three. */
export function cleanCode(value: string): string {
  return value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, CODE_MAX);
}

export interface UnitInput {
  code: string;
  name: string;
}

export interface UnitErrors {
  code?: string;
  name?: string;
}

/** `others`: the other units, with the name people see (an unnamed unit is shown by its letter). */
export function validateUnit(input: UnitInput, others: readonly UnitInput[]): UnitErrors {
  const code = input.code.trim().toUpperCase();
  const errors: UnitErrors = {};

  if (!CODE.test(code)) errors.code = CODE_ERROR;
  else if (others.some((other) => other.code.toUpperCase() === code)) errors.code = `האות ${code} כבר משויכת ליחידה אחרת`;

  const problem = nameError(input.name);
  if (problem) errors.name = problem;
  else if (others.some((other) => same(other.name, input.name))) errors.name = 'כבר קיימת יחידה בשם זה';

  return errors;
}

/** `siblings`: the names of the other departments of the unit (switched-off ones too). */
export function validateDepartment(name: string, siblings: readonly string[]): string | null {
  const problem = nameError(name);
  if (problem) return problem;
  return siblings.some((sibling) => same(sibling, name)) ? 'כבר קיימת ביחידה מחלקה בשם זה' : null;
}

/** A unit whose name is still its letter has not been given a name yet. */
export const isUnnamed = (unit: { code: string; name: string }): boolean => unit.name === unit.code;
