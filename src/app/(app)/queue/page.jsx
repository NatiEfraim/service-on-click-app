import { redirect } from 'next/navigation';
import { legacyQueueTarget } from '@/features/requests/filters';

export default async function QueuePage({ searchParams }) {
  redirect(legacyQueueTarget(await searchParams));
}
