import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { OrgScreen } from '@/features/org/OrgScreen';

export const metadata: Metadata = { title: 'יחידות ומחלקות' };

export default function OrgPage() {
  return (
    <Guard capability="config.global" message="ניהול יחידות ומחלקות שמור למנהל מערכת.">
      <OrgScreen />
    </Guard>
  );
}
