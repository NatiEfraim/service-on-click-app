import { Guard } from '@/components/layout/Guard';
import { AuditScreen } from '@/features/audit/AuditScreen';

export const metadata = { title: 'היסטוריית שינויים' };

export default function Page() {
  return (
    <Guard capability="audit.view">
      <AuditScreen />
    </Guard>
  );
}
