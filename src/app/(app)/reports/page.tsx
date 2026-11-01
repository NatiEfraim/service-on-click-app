import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { PageHead } from '@/components/ui/PageHead';

export const metadata: Metadata = { title: 'דו"חות' };

// placeholder - replaced by the real screen
export default function Page() {
  return (
    <Guard capability="reports.view">
      <PageHead title={'דו"חות'} sub="המסך בבנייה." />
    </Guard>
  );
}
