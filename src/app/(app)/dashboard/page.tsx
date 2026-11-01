import type { Metadata } from 'next';
import { Guard } from '@/components/layout/Guard';
import { DomainDashboard } from '@/features/dashboard/DomainDashboard';

export const metadata: Metadata = { title: 'דשבורד תחום' };

export default function DashboardPage() {
  return (
    <Guard capability="dashboard.view">
      <DomainDashboard />
    </Guard>
  );
}
