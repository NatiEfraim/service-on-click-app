import { Guard } from '@/components/layout/Guard';
import { SyncScreen } from '@/features/sync/SyncScreen';

export const metadata = { title: 'סנכרון עם האפליקציה' };

export default function Page() {
  return (
    <Guard capability="sync.view">
      <SyncScreen />
    </Guard>
  );
}
