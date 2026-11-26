import { Chip } from '@/components/ui/Chips';

/**
 * The department (רמ"ד תו"ב) a booking of the control-officer types (8 and 10) was sent to. The API resolves the label
 * from the departments it shares with the mobile app, so it is shown as it comes and never mapped from the id here.
 * Nothing for any other type, or a booking that has no department (`department_label` is null).
 */
export function DepartmentChip({ booking }) {
  const label = booking?.department_label;
  if (!label) return null;
  return <Chip tone="acc" title={'רמ"ד תו"ב שנבחר בבקשה'}>{label}</Chip>;
}
