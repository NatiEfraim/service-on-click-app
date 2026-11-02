

/** `Y-m-d` of the local calendar day (not UTC: a report made at 01:00 in Israel belongs to that day, not to yesterday). */
function localDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `דוח קריאות 2026-11-01.xlsx` - the file name of a report made on that day. */
export function reportFileName(kind, date = new Date()) {
  return `דוח קריאות ${localDay(date)}.${kind}`;
}

/** Save the blob under that name. The object URL is released a little later (the download has started by then). */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
