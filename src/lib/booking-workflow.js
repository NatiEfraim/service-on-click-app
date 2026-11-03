/** The API keeps the owning stage while these transportation statuses are pending. */
export function isHoldStatus(statusId) {
  return [8, 9, 10].includes(Number(statusId));
}

export function holdDescription(statusId) {
  return ({
    8: 'נדרשת השלמת קבצים מהלקוח',
    9: 'ממתין לאישור ספק',
    10: 'ממתין למספר ספק',
  })[statusId] ?? '';
}
