import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { DomainsScreen } from '@/features/settings/DomainsScreen';

export const metadata: Metadata = { title: 'תחומי שירות' };

export default function Page() {
  return (
    <Guard>
      <DomainsScreen />
    </Guard>
  );
}
