'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { requesterApi } from '@/lib/api/endpoints';
import { APP_NAME } from '@/lib/config';
import { initials } from '@/lib/format';
import { RequesterContent, useRequesterView } from './RequesterContent';
import { useCatalog } from './useRequester';
import './requester.css';

/** A topic's or a type's picture; a plain icon when the server's name has none. */
function Picture({ src }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : <Icon name="layers" />;
}

/** The search box: finds a form by its name, group or topic. */
function TypeSearch({ topics, onPick }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const term = text.trim();
  const allTypes = useMemo(
    () => topics.flatMap((topic) => topic.groups.flatMap((group) => group.types.map((type) => ({ ...type, path: `${topic.name} › ${group.name}` })))),
    [topics],
  );
  const hits = useMemo(() => (term ? allTypes.filter((type) => `${type.name} ${type.path}`.includes(term)) : []), [term, allTypes]);
  const pick = (id) => {
    setText('');
    setOpen(false);
    onPick(id);
  };
  return (
    <div className="search" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}>
      <Icon name="search" className="ico" />
      <input
        value={text}
        onChange={(event) => { setText(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && hits[0]) pick(hits[0].id);
        }}
        placeholder="חיפוש טופס או סוג קריאה"
        aria-label="חיפוש טופס או סוג קריאה"
      />
      {open && term ? (
        <div className="search-results">
          {hits.length ? hits.map((type) => (
            <button key={type.id} type="button" onClick={() => pick(type.id)}>
              <span className="rq-hit-pic"><Picture src={type.img} /></span>
              <span>
                <b>{type.name}</b>
                <span className="small muted rq-hit-path">{type.path}</span>
              </span>
            </button>
          )) : <div className="rq-no-hits small muted">לא נמצא טופס מתאים</div>}
        </div>
      ) : null}
    </div>
  );
}

/** The signed-in user's name and role (GET /user); the personal number only if there is no name. */
export function useRequesterUser() {
  const user = useQuery({ queryKey: ['requester', 'user'], queryFn: ({ signal }) => requesterApi.user(signal), retry: false });
  // GET /user (website API, UserResource) sends the full name as `name`
  const name = user.data?.name || user.data?.full_name || user.data?.personal_number || '';
  const role = user.data?.roles?.[0]?.display_name || 'משתמש';
  return { user, name, role };
}

/**
 * What a plain user (no management role) sees: the requester screen inside a top bar of its own (home, "הקריאות שלי",
 * a form search, the user, sign out). `fallback` is shown when even GET /user fails (the account is not a known user).
 */
export function RequesterHome({ onSignOut, fallback }) {
  const { user, name, role } = useRequesterUser();
  const { view, go, openType } = useRequesterView();
  const catalog = useCatalog();

  if (user.isError) return fallback;
  if (user.isPending) return <div className="login-wrap"><Loading rows={3} /></div>;
  const topics = catalog.data?.topics ?? [];

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <span className="brand">
            <Logo />
            <div>
              <b>{APP_NAME}</b>
              <span>פתיחת קריאה</span>
            </div>
          </span>
          <nav className="tabs-nav" aria-label="ניווט ראשי">
            <a href="?" aria-current={view === 'home' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); go({}); }}>
              <Icon name="home" />
              דף הבית
            </a>
            <a href="?rq=mine" aria-current={view === 'mine' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); go({ rq: 'mine' }); }}>
              <Icon name="list" />
              הקריאות שלי
            </a>
          </nav>
          <div className="top-tools">
            <TypeSearch topics={topics} onPick={openType} />
            <span className="userbtn" style={{ cursor: 'default' }}>
              <span className="avatar">{initials(name)}</span>
              <span className="nm">
                {name}
                <small>{role}</small>
              </span>
            </span>
            <Button size="sm" icon="logout" onClick={() => void onSignOut()}>
              התנתקות
            </Button>
          </div>
        </div>
      </header>
      <main className="page">
        <RequesterContent name={name} />
      </main>
    </>
  );
}
