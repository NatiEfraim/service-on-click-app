'use client';

/** Dates travel as 'YYYY-MM-DD' (what the API's from / to take). */
export const pad = (n) => String(n).padStart(2, '0');

export const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const show = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function presets() {
  const today = new Date();
  return [
    { label: 'היום', from: toIso(today), to: toIso(today) },
    { label: '7 ימים', from: toIso(addDays(today, -6)), to: toIso(today) },
    { label: '30 ימים', from: toIso(addDays(today, -29)), to: toIso(today) },
    { label: 'החודש', from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIso(today) },
  ];
}

/** The 6 x 7 days shown for a month, starting on the Sunday on or before its 1st. */
export function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
