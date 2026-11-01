'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ApiError, setUnauthorizedHandler } from '@/lib/api/client';
import { authApi, startupApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { Capability, Catalog, Me } from '@/lib/api/types';
import { APP_NAME, DEV_LOGIN, LOGIN_URL } from '@/lib/config';
import { canAct as userCanAct, can as userCan } from '@/lib/nav';

export interface Session {
  me: Me;
  catalog: Catalog;
  /** The server's verdict for a screen / menu item (`capabilities` of GET /me). */
  can: (capability: Capability) => boolean;
  /** Holds a role that acts on bookings (only decides whether the "waiting for me" queue is offered). */
  canAct: boolean;
  typeName: (bookingTypeId: number) => string;
  unitName: (unitId: number | null | undefined) => string;
  departmentName: (departmentId: number | null | undefined) => string | null;
  statusLabel: (statusId: number) => string;
  /** Reload units / departments / types after the organisation changed. */
  refreshCatalog: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}

let redirecting = false;

/**
 * Hard navigation to wherever signing in happens: resets every in-memory cache and keeps the page the user was on.
 * Idempotent - several requests can answer 401 at once, and only the first one starts the navigation.
 */
export function redirectToLogin(): void {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login') || redirecting) return;
  redirecting = true;
  if (!DEV_LOGIN && LOGIN_URL) {
    window.location.assign(LOGIN_URL);
    return;
  }
  const next = window.location.pathname + window.location.search;
  // `expired` lets the login page explain why the user is there (the API keeps one session per user: signing in elsewhere ends this one)
  const params = new URLSearchParams({ expired: '1' });
  if (next && next !== '/') params.set('next', next);
  window.location.assign(`/login?${params.toString()}`);
}

function FullPage({ children }: { children: ReactNode }) {
  return <div className="login-wrap">{children}</div>;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();

  const meQuery = useQuery({ queryKey: keys.me, queryFn: ({ signal }) => startupApi.me(signal), staleTime: Infinity, retry: false });
  const catalogQuery = useQuery({ queryKey: keys.catalog, queryFn: ({ signal }) => startupApi.catalog(signal), staleTime: Infinity, retry: false, enabled: meQuery.isSuccess });

  // A 401 anywhere means the session is over: forget everything and go to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // redirect first: clearing the cache makes the mounted queries fetch again, and each of those would answer 401 too
      redirectToLogin();
      client.cancelQueries();
    });
    return () => setUnauthorizedHandler(null);
  }, [client]);

  const me = meQuery.data;
  const catalog = catalogQuery.data;

  const refreshCatalog = useCallback(async () => {
    await client.invalidateQueries({ queryKey: keys.catalog });
  }, [client]);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // the cookie may already be gone; either way the user leaves
    }
    client.clear();
    // a full page load on purpose: nothing of this user may survive in memory
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }, [client]);

  const session = useMemo<Session | null>(() => {
    if (!me || !catalog) return null;
    return {
      me,
      catalog,
      can: (capability) => userCan(me, capability),
      canAct: userCanAct(me),
      typeName: (id) => catalog.booking_types.find((type) => type.id === id)?.display_name ?? `תחום ${id}`,
      // internal unit names are shown inside; the mobile app only knows the letter
      unitName: (id) => (id == null ? 'ללא שיוך ליחידה' : (catalog.units.find((unit) => unit.id === id)?.name ?? `יחידה ${id}`)),
      departmentName: (id) => (id == null ? null : (catalog.departments?.find((department) => department.id === id)?.name ?? null)),
      statusLabel: (id) => catalog.statuses.find((status) => status.id === id)?.display_name ?? `סטטוס ${id}`,
      refreshCatalog,
      signOut,
    };
  }, [me, catalog, refreshCatalog, signOut]);

  const error = meQuery.error ?? catalogQuery.error;

  if (session) return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;

  if (error) {
    const denied = error instanceof ApiError && error.denied;
    return (
      <FullPage>
        <div className="login-card" role="alert">
          <div className="login-brand">
            <div>
              <b>{APP_NAME}</b>
              <span>ניהול ובקרה</span>
            </div>
          </div>
          <h1>{denied ? 'אין לך הרשאה להשתמש במערכת הניהול' : 'לא ניתן להתחבר למערכת'}</h1>
          <p className="login-hint">
            {denied ? 'החשבון שלך אינו משויך לתפקיד ניהולי. אם זו טעות, יש לפנות למפקד המחנה או למנהל המערכת.' : error instanceof ApiError ? error.message : 'אירעה שגיאה. נסו שוב.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {!denied ? (
              <Button
                variant="primary"
                onClick={() => {
                  void meQuery.refetch();
                  void catalogQuery.refetch();
                }}
              >
                נסו שוב
              </Button>
            ) : null}
            <Button icon="logout" onClick={() => void signOut()}>
              התנתקות
            </Button>
          </div>
        </div>
      </FullPage>
    );
  }

  return (
    <FullPage>
      <div role="status" aria-label="טוען" style={{ display: 'grid', justifyItems: 'center', gap: 12, color: 'var(--mute)' }}>
        <Icon name="sync" className="spin-slow" />
        <span>טוען…</span>
      </div>
    </FullPage>
  );
}
