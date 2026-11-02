
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata = { title: 'התחברות' };

export default function LoginPage() {
  // The form reads `?expired=` and `?next=`.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
