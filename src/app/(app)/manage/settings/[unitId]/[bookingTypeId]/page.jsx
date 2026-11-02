import { Guard } from '@/components/layout/Guard';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export const metadata = { title: 'הגדרות תחום' };

export default function Page() {
  return (
    <Guard>
      <SettingsScreen />
    </Guard>
  );
}
