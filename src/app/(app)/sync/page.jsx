
import { Guard } from '@/components/layout/Guard';
import { PageHead } from '@/components/ui/PageHead';

export const metadata = { title: 'סנכרון עם האפליקציה' };

// placeholder - replaced by the real screen
export default function Page() {
  return (
    <Guard capability="sync.view">
      <PageHead title="סנכרון עם האפליקציה" sub="המסך בבנייה." />
    </Guard>
  );
}
