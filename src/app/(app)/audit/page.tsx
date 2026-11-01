import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { PageHead } from '@/components/ui/PageHead';

export const metadata: Metadata = { title: 'היסטוריית שינויים' };

// placeholder - replaced by the real screen
export default function Page() {
  return (
    <Guard capability="audit.view">
      <PageHead title="היסטוריית שינויים" sub="המסך בבנייה." />
    </Guard>
  );
}
