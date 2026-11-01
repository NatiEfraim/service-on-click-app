import type { Metadata } from 'next';
import { QueueScreen } from '@/features/queue/QueueScreen';

export const metadata: Metadata = { title: 'ממתין לטיפולי' };

export default function QueuePage() {
  return <QueueScreen />;
}
