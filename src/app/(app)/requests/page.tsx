import type { Metadata } from 'next';
import { RequestsScreen } from '@/features/requests/RequestsScreen';

export const metadata: Metadata = { title: 'קריאות' };

export default function RequestsPage() {
  return <RequestsScreen />;
}
