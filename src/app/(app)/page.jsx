import { StartScreen } from '@/features/requester/StartScreen';

export const metadata = { title: 'דף הבית' };

/** Where every user starts: open a request and follow your own (the management dashboard is at /overview). */
export default function HomePage() {
  return <StartScreen />;
}
