'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Pager, Seg } from '@/components/ui/Controls';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { useDebounced } from '@/lib/useDebounced';
import { useSession } from '@/providers/SessionProvider';
import { NewUserDialog } from './NewUserDialog';
import { PeopleTable } from './PeopleTable';
import { PermissionsDialog, type PermissionsTarget } from './PermissionsDialog';
import { PAGE_SIZE, type PersonRow } from './people';
import { usePeoplePage, useRoleHolders } from './queries';
import { matchesSearch, parseSearch } from './search';
import './people.css';

type Tab = 'holders' | 'all';

/**
 * Users and permissions. "בעלי תפקידים" lists the people who hold a role (loaded whole, searched in memory); "כל המשתמשים" pages through
 * everybody the signed-in user may see (the server narrows it: an admin sees their own unit) and searches on the server.
 */
export function UsersScreen() {
  const { me } = useSession();
  const [tab, setTab] = useState<Tab>('holders');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState<PermissionsTarget | null>(null);

  // the box filters the loaded role holders at once; the server is asked only after the typing pauses
  const typed = useMemo(() => parseSearch(text), [text]);
  const settledText = useDebounced(text, 300);
  const settled = useMemo(() => parseSearch(settledText), [settledText]);

  // the page number belongs to one search: a new search starts again at page 1 (derived, so no effect has to reset it)
  const [paging, setPaging] = useState({ key: '', page: 1 });
  const page = paging.key === settled.identifier ? paging.page : 1;

  const holders = useRoleHolders(tab === 'holders');
  const everyone = usePeoplePage(settled.identifier, page, tab === 'all' && settled.kind !== 'invalid');

  const holderRows = useMemo(() => (holders.data ?? []).filter((person) => matchesSearch(person, typed)), [holders.data, typed]);
  const allRows = everyone.data ?? [];

  const openPermissions = (row: PersonRow) => setPermissionsFor({ uuid: row.uuid, name: row.name, personalNumber: row.personalNumber, personalId: row.personalId });

  const sub = me.is_super_admin
    ? 'שיבוץ תפקידים לפי תחום בכל היחידות, כולל מפקד מחנה. כל שינוי מחייב סיבה ונרשם בהיסטוריית השינויים.'
    : 'שיבוץ מפקד תחום וגורם מטפל בתחומים שאתה מפקד המחנה שלהם, למשתמשי היחידה שלך. כל שינוי מחייב סיבה ונרשם בהיסטוריית השינויים.';

  const count = tab === 'holders' ? (holders.isSuccess ? `${holderRows.length} ${holderRows.length === 1 ? 'בעל תפקיד' : 'בעלי תפקידים'}` : '') : everyone.isSuccess ? `${allRows.length} משתמשים בעמוד` : '';

  return (
    <div className="narrow">
      <PageHead
        title="משתמשים והרשאות"
        sub={sub}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            משתמש חדש
          </Button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <Seg<Tab>
            label="תצוגה"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'holders', label: 'בעלי תפקידים', count: holders.data?.length },
              { value: 'all', label: 'כל המשתמשים' },
            ]}
          />
          <div className="search" style={{ width: 260 }}>
            <Icon name="search" />
            <input
              value={text}
              placeholder="שם או מספר אישי"
              aria-label="חיפוש לפי שם או מספר אישי"
              autoComplete="off"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <span className="grow" />
          <span className="ppl-count" aria-live="polite">
            {count}
          </span>
        </div>

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
            <PeopleTable rows={holderRows} onOpen={openPermissions} />
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
          <div style={{ opacity: everyone.isFetching ? 0.55 : 1, transition: 'opacity .15s' }}>
            {allRows.length ? <PeopleTable rows={allRows} onOpen={openPermissions} /> : <EmptyState title="לא נמצאו משתמשים">{page > 1 ? 'זה סוף הרשימה.' : 'אפשר לנסות שם אחר או מספר אישי אחר.'}</EmptyState>}
            {page > 1 || allRows.length >= PAGE_SIZE ? (
              <Pager page={page} hasNext={allRows.length >= PAGE_SIZE} noun="משתמשים" onPage={(next) => setPaging({ key: settled.identifier, page: next })} />
            ) : null}
          </div>
        )}
      </section>

      {creating ? (
        <NewUserDialog
          onClose={() => setCreating(false)}
          onCreated={(user) => {
            // show the new person: everybody, narrowed to their number
            setTab('all');
            setText(user.personal_number ?? '');
          }}
        />
      ) : null}
      {permissionsFor ? <PermissionsDialog key={permissionsFor.uuid} target={permissionsFor} onClose={() => setPermissionsFor(null)} /> : null}
    </div>
  );
}
