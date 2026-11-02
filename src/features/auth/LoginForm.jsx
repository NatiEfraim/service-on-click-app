'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { APP_NAME, DEV_LOGIN, LOGIN_URL } from '@/lib/config';
import { PERSONAL_NUMBER_PATTERN } from '@/lib/patterns';
import { safeNext } from '@/lib/safe-next';


/** Dev login by personal number (the API sets the HttpOnly cookie); production uses ADFS via NEXT_PUBLIC_LOGIN_URL. */
export function LoginForm() {
  const redirected = useSearchParams().get('expired') === '1';
  const [personalNumber, setPersonalNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const value = personalNumber.trim();
    if (!PERSONAL_NUMBER_PATTERN.test(value)) {
      setError('מספר אישי הוא 7 או 8 ספרות.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authApi.login(value);
      // Hard navigation clears caches so nothing of a previous user shows.
      window.location.assign(safeNext(new URLSearchParams(window.location.search).get('next'), window.location.origin));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ההתחברות נכשלה.');
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <main className="login-card">
        <div className="login-brand">
          <Logo />
          <div>
            <b>{APP_NAME}</b>
            <span>ניהול ובקרה</span>
          </div>
        </div>

        {redirected ? (
          <Notice tone="warn">כדי להמשיך יש להתחבר. אם הייתם מחוברים, ייתכן שההתחברות הסתיימה או שהתחברתם ממקום אחר (לכל משתמש יש חיבור פעיל אחד).</Notice>
        ) : null}

        {DEV_LOGIN ? (
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }} noValidate>
            <h1>התחברות</h1>
            <Field label="מספר אישי">
              <input
                className="input ltr"
                name="personal_number"
                inputMode="numeric"
                autoComplete="username"
                maxLength={8}
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value.replace(/\D/g, ''))}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                autoFocus
              />
            </Field>
            <div id="login-error" className="err" role="alert" aria-live="polite">
              {error}
            </div>
            <Button type="submit" variant="primary" loading={busy}>
              כניסה
            </Button>
            <p className="login-hint">כניסה לפיתוח מקומי בלבד: השרת המקומי מזהה לפי מספר אישי. בסביבת ייצור ההתחברות מתבצעת דרך ADFS.</p>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <h1>התחברות</h1>
            <p className="login-hint">ההתחברות למערכת מתבצעת דרך שירות הזיהוי הארגוני.</p>
            {LOGIN_URL ? (
              <Button variant="primary" onClick={() => window.location.assign(LOGIN_URL)}>
                מעבר להתחברות
              </Button>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
