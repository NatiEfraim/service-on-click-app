import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'התחברות' };

export default function LoginPage() {
  // the form reads `?expired=` / `?next=` from the address
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
