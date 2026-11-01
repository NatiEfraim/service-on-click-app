/** Placeholder the server stores for a cleared statement; shown as an empty box. */
export const NO_STATEMENT = 'לא קיימת הצהרה';

export const statementFromServer = (text: string | null | undefined): string => (!text || text.trim() === NO_STATEMENT ? '' : text);

/** Characters the server accepts in a statement. */
const ALLOWED = /^[\p{Script=Hebrew}A-Za-z0-9\s,.:!@%*$(){}[\]/|\\\-'"]$/u;

/** The characters of the text the server would refuse, each once. */
export function forbiddenChars(text: string): string[] {
  return [...new Set([...text].filter((char) => !ALLOWED.test(char)))];
}

/** Why the statement cannot be saved, or null. An active statement needs a text (the server answers 400 otherwise). */
export function statementError(text: string, active: boolean): string | null {
  if (active && text.trim() === '') return 'להצהרה פעילה חייב להיות נוסח.';
  const bad = forbiddenChars(text);
  if (bad.length) return `התווים הבאים אינם מותרים בהצהרה: ${bad.join(' ')}   (מותרים אותיות, ספרות, רווחים והסימנים , . : ! @ % * $ ( ) { } [ ] / | \\ - ' ")`;
  return null;
}
