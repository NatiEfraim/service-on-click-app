import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { PageHead } from '@/components/ui/PageHead';

export const metadata: Metadata = { title: 'הגדרות תחום' };

// placeholder - replaced by the real screen
export default function Page() {
  return (
    <Guard>
      <PageHead title="הגדרות תחום" sub="המסך בבנייה." />
    </Guard>
  );
}
