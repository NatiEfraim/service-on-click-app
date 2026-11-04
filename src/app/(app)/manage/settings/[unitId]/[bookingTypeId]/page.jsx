import { Guard } from '@/components/layout/Guard';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export const metadata = { title: 'הגדרות תחום' };

export default function Page() {
  return (
    <Guard superAdmin message="ניהול תחומי שירות שמור למנהל מערכת.">
      <SettingsScreen />
    </Guard>
  );
}
