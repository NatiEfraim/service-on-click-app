'use client';

import { Button } from '@/components/ui/Button';

/** Fallback for unexpected render errors. */
export default function GlobalError({ reset }) {
  return (
    <div className="login-wrap">
      <main className="login-card" role="alert">
        <h1>משהו השתבש</h1>
        <p className="login-hint">אירעה שגיאה בלתי צפויה בהצגת המסך. אפשר לנסות שוב.</p>
        <Button variant="primary" onClick={reset}>
          נסו שוב
        </Button>
      </main>
    </div>
  );
}
