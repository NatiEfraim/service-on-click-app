
import { sourceTag, statusTone } from '@/lib/labels';

export function Chip({ tone = '', children, title }) {
  return (
    <span className={`chip ${tone}`.trim()} title={title}>
      {children}
    </span>
  );
}

/** Booking status; the colour comes from the status number (shared with the mobile app). */
export function StatusChip({ statusId, label }) {
  return <Chip tone={statusTone(statusId)}>{label}</Chip>;
}

/** Sync conflict: the mobile app changed the booking while a decision here was pending. */
export function NeedsDecision() {
  return <Chip tone="bad">נדרשת הכרעה</Chip>;
}

/** Origin of a change: mobile app, person, or automatic. */
export function SourceTag({ source }) {
  const tag = sourceTag(source);
  return tag ? <span className={`tag ${tag.tone}`}>{tag.label}</span> : null;
}
