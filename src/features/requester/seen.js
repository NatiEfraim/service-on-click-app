'use client';

import { useSyncExternalStore } from 'react';

/**
 * "Changed since your last visit": the browser remembers the status each request had when the user last saw it
 * (localStorage, per browser). A request whose status differs, or that is new since then, counts as changed until the
 * user opens it (or marks all as seen). The first visit only records what is there, so nothing is highlighted then.
 */
const KEY = 'requester-seen-v1';

let cache;
const listeners = new Set();

function read() {
  if (cache !== undefined) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private window or blocked storage: it still works until the page is reloaded
  }
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What a row's status is, as stored: the demo status or the real status id. */
export const statusKey = (row) => String(row.status ?? row.statusId ?? '');

/** The remembered statuses ({request id: status}), or null before the first visit; re-renders when they change. */
export function useSeen() {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** First visit: remember every request as seen, so only later changes stand out. */
export function rememberFirstVisit(rows) {
  if (read() !== null) return;
  write(Object.fromEntries(rows.map((row) => [row.id, statusKey(row)])));
}

/** Changed since last seen: a status that differs, or a request not seen before. Never before the first visit. */
export function isChanged(seen, row) {
  return seen !== null && seen[row.id] !== statusKey(row);
}

/** Remember these requests as seen in their current status. */
export function markSeen(rows) {
  const current = read() ?? {};
  const next = { ...current };
  let changed = false;
  for (const row of rows) {
    const key = statusKey(row);
    if (next[row.id] !== key) {
      next[row.id] = key;
      changed = true;
    }
  }
  if (changed || read() === null) write(next);
}
