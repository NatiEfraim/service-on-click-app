import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { PageHead } from '@/components/ui/PageHead';

export const metadata: Metadata = { title: 'תחומי שירות' };

// placeholder - replaced by the real screen
export default function Page() {
  return (
    <Guard>
      <PageHead title="תחומי שירות" sub="המסך בבנייה." />
    </Guard>
  );
}
