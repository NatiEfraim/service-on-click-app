'use client';

import { Button } from '@/components/ui/Button';

/** Last resort for an unexpected error while rendering a screen. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
