import { Guard } from '@/components/layout/Guard';
import { DomainsScreen } from '@/features/settings/DomainsScreen';

export const metadata = { title: 'תחומי שירות' };

export default function Page() {
  return (
    <Guard domains message="ניהול תחומי שירות שמור למנהל המערכת ולאחראי התחומים.">
      <DomainsScreen />
    </Guard>
  );
}
