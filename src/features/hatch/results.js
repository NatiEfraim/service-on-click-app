/**
 * What each digital-hatch answer means (the frontend guide of 2026-11-17), as lines for the card's result block:
 * { tone: 'ok' | 'info' | 'warn' | 'bad', text }. `info` lines are notices (switched off, busy, queued), never errors.
 * Every answer echoes the channel that actually ran (`data.channel`); it is shown first.
 */

const BUSY = 'פעולה זו כבר מתבצעת - נסו שוב עוד רגע.';
const QUEUED = 'הפעולה הועברה לתור - התוצאות יהיו זמינות בקרוב.';
const FTP_OFF = 'הממשק ל-FTP כבוי בשרת - ניתן להריץ ישירות מול ה-bucket.';
const SERVER_ERROR = 'הפעולה נכשלה בשרת. נסו שוב או בדקו את יומן השרת.';

const CHANNEL_NAME = { ftp: 'דרך ה-FTP', bucket: 'ישירות ל-bucket' };

const SKIPPED = {
  export_json_disabled: 'הייצוא כבוי בשרת (EXPORT_JSON_ENABLED=false).',
  busy: BUSY,
};

const errorLines = (...lists) => lists.flatMap((list) => list ?? []).map((text) => ({ tone: 'bad', text }));
const channelLine = (data) => (data?.channel ? [{ tone: 'info', text: `מסלול: ${CHANNEL_NAME[data.channel] ?? data.channel}` }] : []);

/**
 * An export: booking status, users or system references. `noun` names the counted rows, `countKey` the field of `built`
 * that counts them (bookings / users / records).
 */
export function exportLines(data, noun, countKey) {
  if (!data) return [{ tone: 'bad', text: SERVER_ERROR }];
  // the FTP channel was asked for while the hatch is off: nothing ran
  if (data.enabled === false) return [{ tone: 'info', text: FTP_OFF }];
  if (data.queued) return [...channelLine(data), { tone: 'info', text: QUEUED }];
  const result = data.result ?? {};
  const lines = channelLine(data);
  if (result.busy) return [...lines, { tone: 'info', text: BUSY }];
  if (result.skipped) lines.push({ tone: 'info', text: SKIPPED[result.skipped] ?? `הפעולה דולגה (${result.skipped}).` });

  // the booking-status export on the bucket channel answers with its three files' own results (status, values, config)
  if (!result.built && (result.status || result.values || result.config)) {
    lines.push({ tone: 'ok', text: 'הייצוא ל-bucket הסתיים: קבצי הסטטוסים, הערכים וההגדרות נכתבו.' });
    return [...lines, ...errorLines(result.errors, result.status?.errors, result.values?.errors, result.config?.errors)];
  }

  const built = result.built;
  const file = result.file ?? built?.file;
  if (built?.written) {
    lines.push({ tone: 'ok', text: `נשלחו ${built[countKey] ?? 0} ${noun}${file ? ` בקובץ ${file}` : ''}.` });
    if (built.in_file != null) lines.push({ tone: 'info', text: `בקובץ של היום: ${built.in_file} ${noun}.` });
  } else if (built?.reason === 'nothing_waiting') {
    lines.push({ tone: 'info', text: `אין ${noun} בהמתנה.` });
  } else if (built?.reason === 'unchanged') {
    // a skipped resend is not an error: this exact content already went (the ledger); force pushes it again
    lines.push({ tone: 'info', text: 'הקובץ זהה לשליחה האחרונה ולכן לא נשלח שוב. סמנו "שליחה בכפייה" כדי לשלוח בכל זאת.' });
  }
  if (result.destination) lines.push({ tone: 'info', text: `יעד: ${result.destination}` });
  if (result.marked != null) lines.push({ tone: 'info', text: `סומנו כנשלחו: ${result.marked}.` });
  if (result.errors?.length) lines.push({ tone: 'warn', text: 'הסימון לא נוקה - הריצה הבאה תנסה שוב.' });
  return [...lines, ...errorLines(result.errors)];
}

/**
 * An import (bookings, action log, attachments): since 2026-11-15 the answer is only the outcome - the details are in
 * the server log. `ok && ran` = done; `ran: false` = nothing ran (off, busy or queued); `ok: false` (HTTP 500) = failed
 * or still waits, the files stay in place and retry on the next run.
 */
export function importLines(data) {
  if (!data) return [{ tone: 'bad', text: SERVER_ERROR }];
  const lines = channelLine(data);
  if (data.ok === false) return [...lines, { tone: 'bad', text: data.error || SERVER_ERROR }, { tone: 'info', text: 'הקבצים שנכשלו נשארו במקומם וינוסו שוב בריצה הבאה.' }];
  if (data.ran === false) return [...lines, { tone: 'info', text: 'לא בוצע - ריצה אחרת פעילה או שהייבוא כבוי.' }];
  return [...lines, { tone: 'ok', text: 'הייבוא הסתיים בהצלחה.' }];
}

/** Whether an import answer is a full success (to show the next step's hint). */
export const importSucceeded = (data) => Boolean(data?.ok && data?.ran);
