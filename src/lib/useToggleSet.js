'use client';

import { useState } from 'react';

/**
 * A set of ids that toggle in and out - e.g. which folding groups are open. `initial` is the starting ids (or a
 * function returning them, read once). Returns [set, toggle(id)].
 */
export function useToggleSet(initial = []) {
  const [set, setSet] = useState(() => new Set(typeof initial === 'function' ? initial() : initial));
  const toggle = (id) =>
    setSet((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return [set, toggle];
}
