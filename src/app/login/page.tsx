import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'התחברות' };

export default function LoginPage() {
  // The form reads `?expired=` and `?next=`.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
