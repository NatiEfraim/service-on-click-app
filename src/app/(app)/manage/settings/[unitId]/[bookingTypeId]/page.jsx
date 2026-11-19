import { Guard } from '@/components/layout/Guard';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export const metadata = { title: 'הגדרות תחום' };

export default function Page() {
  return (
    <Guard domains message="ניהול תחומי שירות שמור למנהל המערכת ולאחראי התחומים.">
      <SettingsScreen />
    </Guard>
  );
}
