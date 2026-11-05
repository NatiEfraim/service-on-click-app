'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Seg } from '@/components/ui/Controls';
import { FadeIn } from '@/components/ui/FadeIn';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { SearchField } from '@/components/ui/SearchField';
import { useSmoothHeight } from '@/components/ui/SmoothSize';
import { useDebounced } from '@/lib/useDebounced';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useSession } from '@/providers/SessionProvider';
import { NewUserDialog } from './NewUserDialog';
import { PeopleTable } from './PeopleTable';
import { PermissionsDialog } from './PermissionsDialog';
import { PAGE_SIZE } from './people';
import { usePeopleInfinite, useRoleHolders } from './queries';
import { LOAD_AHEAD_PX } from '@/features/queue/constants';
import { matchesSearch, parseSearch } from './search';
import './people.css';



/** Users and permissions: role holders search in memory, all users page and search on the server. */
export function UsersScreen() {
  const { me } = useSession();
  const [tab, setTab] = useState('holders');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState(null);

  // local filter is instant; the server is queried after typing pauses
  const typed = useMemo(() => parseSearch(text), [text]);
  const settledText = useDebounced(text, 300);
  const settled = useMemo(() => parseSearch(settledText), [settledText]);

  const holders = useRoleHolders(tab === 'holders');
  const everyone = usePeopleInfinite(settled.identifier, tab === 'all' && settled.kind !== 'invalid');

  const holderRows = useMemo(() => (holders.data ?? []).filter((person) => matchesSearch(person, typed)), [holders.data, typed]);
  const allRows = everyone.data ?? [];

  // the card ends at the window's bottom (only the table scrolls) and glides to its new height on a tab switch or load
  const card = useRef(null);
  useFitToWindow(card);
  const bodyState = tab === 'holders' ? (holders.isPending ? 'loading' : `holders:${holderRows.length}`) : everyone.isPending ? 'loading' : `all:${allRows.length ? 'rows' : 'empty'}`;
  useSmoothHeight(card, `${tab}|${bodyState}`);

  // all users: the next 20 load as the bottom of the table scrolls into view
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = everyone;
  useEffect(() => {
    const el = sentinel.current;
    if (tab !== 'all' || !el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { root: scroller.current, rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openPermissions = (row) => setPermissionsFor({ uuid: row.uuid, name: row.name, personalNumber: row.personalNumber, personalId: row.personalId });

  const count = tab === 'holders' ? (holders.isSuccess ? `${holderRows.length} ${holderRows.length === 1 ? 'בעל תפקיד' : 'בעלי תפקידים'}` : '') : everyone.isSuccess ? `${allRows.length}${hasNextPage ? '+' : ''} משתמשים` : '';

  return (
    <div>
      <PageHead hideTitle title="משתמשים והרשאות" />

      <section ref={card} className="card fit-card">
        <div className="toolbar">
          <Seg
            label="תצוגה"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'holders', label: 'בעלי תפקידים', count: holders.data?.length },
              { value: 'all', label: 'כל המשתמשים' },
            ]}
          />
          <SearchField width={260} value={text} placeholder="שם או מספר אישי" aria-label="חיפוש לפי שם או מספר אישי" autoComplete="off" onChange={setText} />
          <span className="grow" />
          <span className="ppl-count" aria-live="polite">
            {count}
          </span>
          {/* a new user is added from the bar of the list it joins */}
          <Button size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>
            משתמש חדש
          </Button>
        </div>

        {/* the body fades in afresh on every tab switch (key) while the card glides to its new height */}
        <FadeIn key={tab} className="fit-fill">
        {tab === 'holders' ? (
          holders.isPending ? (
            <div className="card-body">
              <Loading rows={6} />
            </div>
          ) : holders.isError ? (
            <div className="card-body">
              <ErrorNotice error={holders.error} onRetry={() => void holders.refetch()} />
            </div>
          ) : holderRows.length ? (
            <div className="queue-scroll">
              <PeopleTable rows={holderRows} onOpen={openPermissions} />
            </div>
          ) : text.trim() ? (
            <EmptyState title="לא נמצאו בעלי תפקידים">
              {typed.message ?? 'אפשר לחפש גם בכל המשתמשים.'}
              {typed.kind === 'invalid' ? null : (
                <div style={{ marginTop: 10 }}>
                  <Button size="sm" onClick={() => setTab('all')}>
                    חיפוש בכל המשתמשים
                  </Button>
                </div>
              )}
            </EmptyState>
          ) : (
            <EmptyState title="אין עדיין בעלי תפקידים">אפשר לשבץ תפקיד לכל משתמש דרך &quot;כל המשתמשים&quot;.</EmptyState>
          )
        ) : settled.kind === 'invalid' ? (
          <EmptyState title="החיפוש אינו תקין">{settled.message}</EmptyState>
        ) : everyone.isPending ? (
          <div className="card-body">
            <Loading rows={6} />
          </div>
        ) : everyone.isError ? (
          <div className="card-body">
            <ErrorNotice error={everyone.error} onRetry={() => void everyone.refetch()} />
          </div>
        ) : (
          // dimmed only while a new search replaces the list, not while the next 20 load at the bottom
          <div className={`fit-fill${everyone.isPlaceholderData ? ' is-stale' : ''}`}>
            {allRows.length ? (
              <div ref={scroller} className="queue-scroll">
                <PeopleTable rows={allRows} onOpen={openPermissions} />
                <div ref={sentinel} />
                {isFetchingNextPage ? (
                  <div className="card-body">
                    <Loading rows={2} />
                  </div>
                ) : hasNextPage ? null : allRows.length > PAGE_SIZE ? (
                  <div className="pager">
                    <span>הוצגו כל {allRows.length} המשתמשים.</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="לא נמצאו משתמשים">אפשר לנסות שם אחר או מספר אישי אחר.</EmptyState>
            )}
          </div>
        )}
        </FadeIn>
      </section>

      {creating ? (
        <NewUserDialog
          onClose={() => setCreating(false)}
          onCreated={(user) => {
            // show the new person: all users, filtered by their number
            setTab('all');
            setText(user.personal_number ?? '');
          }}
        />
      ) : null}
      {permissionsFor ? <PermissionsDialog key={permissionsFor.uuid} target={permissionsFor} onClose={() => setPermissionsFor(null)} /> : null}
    </div>
  );
}
