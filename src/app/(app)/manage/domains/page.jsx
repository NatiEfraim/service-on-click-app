import { Guard } from '@/components/layout/Guard';
import { DomainsScreen } from '@/features/settings/DomainsScreen';

export const metadata = { title: 'תחומי שירות' };

export default function Page() {
  return (
    <Guard superAdmin message="ניהול תחומי שירות שמור למנהל מערכת.">
      <DomainsScreen />
    </Guard>
  );
}
