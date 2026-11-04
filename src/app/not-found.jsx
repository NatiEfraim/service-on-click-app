import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="login-wrap">
      <main className="login-card">
        <h1>הדף לא נמצא</h1>
        <p className="login-hint">הכתובת שביקשתם אינה קיימת במערכת.</p>
        <Link className="btn primary" href="/">
          חזרה למסך הראשי
        </Link>
      </main>
    </div>
  );
}
