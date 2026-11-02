import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export const metadata: Metadata = { title: 'הגדרות תחום' };

export default function Page() {
  return (
    <Guard>
      <SettingsScreen />
    </Guard>
  );
}
