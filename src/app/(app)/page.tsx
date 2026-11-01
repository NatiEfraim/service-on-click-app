import type { Metadata } from 'next';
import { HomeRouter } from '@/features/dashboard/HomeRouter';

export const metadata: Metadata = { title: 'מסך ראשי' };

export default function HomePage() {
  return <HomeRouter />;
}
