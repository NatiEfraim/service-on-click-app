import type { ReactNode } from 'react';

/** A labelled form control: the caption above, the input / select / textarea as children. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
