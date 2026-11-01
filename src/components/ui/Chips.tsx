import type { ReactNode } from 'react';
import { sourceTag, statusTone, type ChipTone } from '@/lib/labels';

export function Chip({ tone = '', children, title }: { tone?: ChipTone; children: ReactNode; title?: string }) {
  return (
    <span className={`chip ${tone}`.trim()} title={title}>
      {children}
    </span>
  );
}

/** The status of a booking; its colour comes from the status number (shared with the mobile app). */
export function StatusChip({ statusId, label }: { statusId: number; label: string }) {
  return <Chip tone={statusTone(statusId)}>{label}</Chip>;
}

/** "נדרשת הכרעה" - the mobile app changed the booking while a decision made here was waiting. */
export function NeedsDecision() {
  return <Chip tone="bad">נדרשת הכרעה</Chip>;
}

/** Where a change came from: the mobile app, a person here, or automatic. */
export function SourceTag({ source }: { source: string | null | undefined }) {
  const tag = sourceTag(source);
  return tag ? <span className={`tag ${tag.tone}`}>{tag.label}</span> : null;
}
