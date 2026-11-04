import { Guard } from '@/components/layout/Guard';
import { HatchScreen } from '@/features/hatch/HatchScreen';

export const metadata = { title: 'צוהר דיגיטלי' };

export default function Page() {
  return (
    <Guard superAdmin message="הצוהר הדיגיטלי שמור למנהל מערכת.">
      <HatchScreen />
    </Guard>
  );
}
