import { HomeRouter } from '@/features/dashboard/HomeRouter';

export const metadata = { title: 'מסך ראשי' };

/** The management dashboard (by role: domain tiles, one domain's dashboard, or the handler's queue). */
export default function OverviewPage() {
  return <HomeRouter />;
}
