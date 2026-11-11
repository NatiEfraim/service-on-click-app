'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/FadeIn';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { requesterApi } from '@/lib/api/endpoints';
import { APP_NAME } from '@/lib/config';
import { initials } from '@/lib/format';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { MyRequestsPanel } from './MyRequestsPanel';
import { RequestForm } from './RequestForm';
import { counterOf, findType } from './requesterData';
import { isChanged, rememberFirstVisit, useSeen } from './seen';
import { useCatalog, useCounters, useMyRequests } from './useRequester';
import './requester.css';

const COUNTERS = [
  { id: 'open', label: 'קריאות פתוחות', icon: 'inbox' },
  { id: 'action', label: 'נדרשת פעולה ממך', icon: 'alert' },
  { id: 'handling', label: 'בטיפול אצל גורם', icon: 'sync' },
  { id: 'done', label: 'הושלמו', icon: 'check' },
];

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

/**
 * What a plain user (no management role) sees: open a request by topic, and their own requests.
 * The screen (home / my requests / a form) lives in the URL (`?rq=`, `?type=<booking type id>`), so Back works.
 * Topics and types come from GET /requester/catalog, the counters from GET /requester/counters, the name from GET /user.
 */
export function RequesterHome({ onSignOut, fallback }) {
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const user = useQuery({ queryKey: ['requester', 'user'], queryFn: ({ signal }) => requesterApi.user(signal), retry: false });
  const catalog = useCatalog();
  const counters = useCounters();
  // the user's requests (shared with the "הקריאות שלי" panel's cache): which of them changed since the last visit
  const mine = useMyRequests(null);
  const seen = useSeen();
  useEffect(() => {
    if (mine.data) rememberFirstVisit(mine.data);
  }, [mine.data]);
  const changedIn = (counterId) =>
    (mine.data ?? []).filter((row) => isChanged(seen, row) && (counterId === 'open' ? ['action', 'handling'].includes(counterOf(row)) : counterOf(row) === counterId)).length;
  // topic cards the user folded (the chevron in each card's head)
  const [closed, setClosed] = useState([]);

  if (user.isError) return fallback;
  if (user.isPending) return <div className="login-wrap"><Loading rows={3} /></div>;

  // GET /user (website API, UserResource) sends the full name as `name`; the personal number only if there is no name
  const name = user.data?.name || user.data?.full_name || user.data?.personal_number || '';
  const role = user.data?.roles?.[0]?.display_name || 'משתמש';
  const topics = catalog.data?.topics ?? [];
  const typeId = search.get('type');
  const found = typeId && catalog.data ? findType(catalog.data, typeId) : null;
  const view = typeId ? 'form' : search.get('rq') === 'mine' ? 'mine' : 'home';
  const counts = counters.data;

  const go = (patch) => setParams({ rq: null, type: null, cat: null, bucket: null, sent: null, ...patch }, 'push');
  const openType = (id) => go({ type: String(id) });

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
        {view === 'form' ? (
          <FadeIn key={typeId}>
            {catalog.isPending ? (
              <Loading rows={8} />
            ) : catalog.isError ? (
              <ErrorNotice error={catalog.error} title="לא ניתן לפתוח את הטופס." onRetry={() => void catalog.refetch()} />
            ) : found ? (
              <RequestForm found={found} onHome={() => go({})} onDone={(serial) => go({ rq: 'mine', sent: serial || null })} />
            ) : (
              <EmptyState title="סוג הקריאה אינו זמין לך">
                ייתכן שאין לך הרשאה לפתוח אותו, או שהוא אינו פעיל ביחידה שלך.{' '}
                <button type="button" className="rq-link" onClick={() => go({})}>חזרה לדף הבית</button>
              </EmptyState>
            )}
          </FadeIn>
        ) : view === 'mine' ? (
          <FadeIn key="mine">
            <MyRequestsPanel full category={search.get('cat')} onCategory={(cat) => setParams({ cat })} bucket={search.get('bucket')} onBucket={(bucket) => setParams({ bucket })} sent={search.get('sent')} onSentSeen={() => setParams({ sent: null })} />
          </FadeIn>
        ) : (
          <FadeIn key="home">
            <div className="rq-hello">
              <h1>שלום, {name}</h1>
              <p>באיזה נושא תרצה לפתוח קריאה?</p>
            </div>
            <div className="rq-counters">
              {COUNTERS.map((counter) => (
                // a counter opens "הקריאות שלי" filtered to its requests (?bucket=)
                <button
                  key={counter.id}
                  type="button"
                  className={`card rq-counter ${counter.id}`}
                  onClick={() => go({ rq: 'mine', bucket: counter.id })}
                  aria-label={`${counter.label}: ${counts ? counts[counter.id] : ''}. הצגת הקריאות`}
                >
                  <span className="ic"><Icon name={counter.icon} /></span>
                  <span className="rq-counter-txt">
                    <b>{counts ? counts[counter.id] ?? 0 : '–'}</b>
                    <span className="lbl">{counter.label}</span>
                    {changedIn(counter.id) ? <span className="rq-changed-count">{changedIn(counter.id)} עודכנו מאז הביקור האחרון</span> : null}
                  </span>
                </button>
              ))}
            </div>
            <div className="rq-home">
              <div className="rq-topics">
                {catalog.isPending ? (
                  <div className="card"><Loading rows={6} /></div>
                ) : catalog.isError ? (
                  <ErrorNotice error={catalog.error} title="לא ניתן להציג את סוגי הקריאות." onRetry={() => void catalog.refetch()} />
                ) : !topics.length ? (
                  <section className="card"><EmptyState title="אין נושאים זמינים לך לפתיחת קריאה">ההרשאות לפתיחת קריאות נקבעות לפי התפקיד והיחידה שלך.</EmptyState></section>
                ) : (
                  topics.map((topic) => {
                    const open = !closed.includes(topic.id);
                    const count = topic.groups.reduce((sum, group) => sum + group.types.length, 0);
                    return (
                      <section key={topic.id} className={`card rq-topic${open ? '' : ' closed'}`} aria-label={topic.name}>
                        <button
                          type="button"
                          className="rq-topic-head"
                          aria-expanded={open}
                          onClick={() => setClosed((previous) => (open ? [...previous, topic.id] : previous.filter((id) => id !== topic.id)))}
                        >
                          <span className="pic"><Picture src={topic.img} /></span>
                          <span className="txt">
                            <b>{topic.name}</b>
                            <span>{count} סוגי קריאות</span>
                          </span>
                          <Icon name="down" className="chev" />
                        </button>
                        {open ? (
                          <div className="rq-topic-body">
                            {topic.groups.map((group) => (
                              <div key={group.id} className="rq-group">
                                <h3>{group.name}</h3>
                                <div className="rq-types">
                                  {group.types.map((type) => (
                                    <button key={type.id} type="button" className="rq-type" onClick={() => openType(type.id)}>
                                      <Picture src={type.img} />
                                      <span className="txt">
                                        <b>{type.name}</b>
                                        {type.description ? <span>{type.description}</span> : null}
                                      </span>
                                      <Icon name="left" className="go" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })
                )}
              </div>
              <MyRequestsPanel category={search.get('cat')} onCategory={(cat) => setParams({ cat })} onAll={() => go({ rq: 'mine', cat: search.get('cat') })} />
            </div>
          </FadeIn>
        )}
      </main>
    </>
  );
}
