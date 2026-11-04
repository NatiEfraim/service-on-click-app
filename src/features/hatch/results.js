/**
 * What each digital-hatch answer means, as lines for the card's result block: { tone: 'ok' | 'info' | 'warn' | 'bad', text }.
 * `info` lines are notices (switched off, busy, queued), never errors.
 */

const BUSY = 'פעולה זו כבר מתבצעת - נסו שוב עוד רגע.';
const QUEUED = 'הפעולה הועברה לתור - התוצאות יהיו זמינות בקרוב.';

const SKIPPED = {
  digital_hatch: 'הפעולה דולגה: הצוהר הדיגיטלי פעיל ונבחר מסלול שגוי.',
  export_json_disabled: 'הייצוא כבוי בשרת (EXPORT_JSON_ENABLED=false).',
  busy: BUSY,
};

const errorLines = (...lists) => lists.flatMap((list) => list ?? []).map((text) => ({ tone: 'bad', text }));

/** A notice that ends the read: switched off or queued; null when there is a result to read. */
function stopped(data, offText) {
  if (!data || data.enabled === false) return [{ tone: 'info', text: offText }];
  if (data.queued) return [{ tone: 'info', text: QUEUED }];
  return null;
}

/** Export booking status / users: `noun` names the counted rows, `countKey` the field of `built` that counts them. */
export function exportLines(data, noun, countKey) {
  const stop = stopped(data, 'הצוהר הדיגיטלי מנותק בשרת.');
  if (stop) return stop;
  const result = data.result ?? {};
  const lines = [];
  if (result.skipped) lines.push({ tone: 'info', text: SKIPPED[result.skipped] ?? `הפעולה דולגה (${result.skipped}).` });
  const built = result.built;
  if (built?.written) {
    lines.push({ tone: 'ok', text: `נשלח: ${built[countKey] ?? 0} ${noun}${result.file ?? built.file ? ` בקובץ ${result.file ?? built.file}` : ''}.` });
    if (built.in_file != null) lines.push({ tone: 'info', text: `בקובץ של היום: ${built.in_file} ${noun}.` });
  } else if (built?.reason === 'nothing_waiting') {
    lines.push({ tone: 'info', text: `אין ${noun} בהמתנה.` });
  } else if (built?.reason === 'unchanged') {
    lines.push({ tone: 'info', text: 'הקובץ לא השתנה מאז השליחה האחרונה.' });
  }
  if (built && !built.written && result.file == null && built.reason !== 'nothing_waiting') {
    lines.push({ tone: 'info', text: 'הקובץ לא נשלח (תוכן זהה לשליחה האחרונה - סמנו "שליחה בכפייה" כדי לשלוח בכל זאת).' });
  }
  if (result.destination) lines.push({ tone: 'info', text: `יעד: ${result.destination}` });
  if (result.marked != null) lines.push({ tone: 'info', text: `סומנו כנשלחו: ${result.marked}.` });
  return [...lines, ...errorLines(result.errors)];
}

/** Import booking json / application log json; `logs` adds the "no matching booking" warning. */
export function importJsonLines(data, logs = false) {
  const stop = stopped(data, 'הייבוא מנותק (HATCH_ENABLED=false).');
  if (stop) return stop;
  const result = data.result ?? {};
  const imported = result.imported ?? {};
  const lines = [];
  if (result.source) lines.push({ tone: 'info', text: `מקור: ${result.source}` });
  const fetched = result.fetched ?? [];
  lines.push({ tone: 'info', text: fetched.length ? `קבצים שנלקחו מה-FTP: ${fetched.join(', ')}` : 'לא נמצאו קבצים חדשים ב-FTP.' });
  if (imported.busy) lines.push({ tone: 'info', text: BUSY });
  if (imported.disabled) lines.push({ tone: 'info', text: 'הייבוא כבוי בשרת.' });

  const files = imported.files ?? [];
  let notFound = 0;
  for (const file of files) {
    const stats = file.stats ?? {};
    const counts = logs
      ? `${stats.created ?? 0} נשמרו`
      : `${stats.created ?? 0} נוצרו, ${stats.updated ?? 0} עודכנו${stats.values_skipped ? `, ${stats.values_skipped} ערכים דולגו` : ''}`;
    lines.push({ tone: file.errors?.length ? 'warn' : 'ok', text: `${file.file}: ${file.rows ?? 0} שורות - ${counts}.` });
    notFound += stats.booking_not_found ?? 0;
  }
  if (!imported.busy && !imported.disabled && files.length === 0) lines.push({ tone: 'info', text: 'לא היו קבצים לייבוא.' });
  if (logs && notFound > 0) lines.push({ tone: 'warn', text: `${notFound} לוגים לא נמצאה עבורם הזמנה - ייבאו קודם את קובץ ההזמנות והפעילו שוב.` });

  return [...lines, ...errorLines(result.errors, imported.errors, ...files.map((file) => file.errors))];
}

/** Import files (attachments from the bucket). */
export function importFilesLines(data) {
  const stop = stopped(data, 'הייבוא מנותק (HATCH_ENABLED=false).');
  if (stop) return stop;
  const imported = data.result?.imported ?? {};
  if (imported.busy) return [{ tone: 'info', text: BUSY }, ...errorLines(imported.errors)];
  const lines = [
    { tone: 'ok', text: `נמצאו ${imported.in_bucket ?? 0} קבצים, הועתקו ${imported.moved ?? 0}, קושרו ${imported.linked ?? 0}${imported.already_linked ? `, ${imported.already_linked} כבר היו מקושרים` : ''}.` },
  ];
  if (imported.unclaimed > 0) lines.push({ tone: 'warn', text: `${imported.unclaimed} קבצים ממתינים להזמנה שעוד לא ייובאה.` });
  if (imported.waiting > 0) lines.push({ tone: 'warn', text: `${imported.waiting} קבצים מצוינים בהזמנות אך טרם הגיעו.` });
  return [...lines, ...errorLines(imported.errors)];
}
