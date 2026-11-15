'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
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

/**
 * Where the requester screen is (home / "הקריאות שלי" / a form), from the URL (`?rq=`, `?type=<booking type id>`),
 * and how to move: `go` pushes a history entry, so Back works. Shared by the content and the regular user's top bar.
 */
export function useRequesterView() {
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const typeId = search.get('type');
  const view = typeId ? 'form' : search.get('rq') === 'mine' ? 'mine' : 'home';
  const go = (patch) => setParams({ rq: null, type: null, cat: null, bucket: null, sent: null, ...patch }, 'push');
  const openType = (id) => go({ type: String(id) });
  return { search, setParams, typeId, view, go, openType };
}

/**
 * The requester screen itself, without a frame: open a request by topic, the counters, and "הקריאות שלי". The regular
 * user sees it inside its own top bar (RequesterHome); every management role sees it as its home, inside the app's frame.
 * Topics and types come from GET /requester/catalog, the counters from GET /requester/counters.
 */
export function RequesterContent({ name, extraCategories = null }) {
  const { search, setParams, typeId, view, go, openType } = useRequesterView();
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

  const topics = catalog.data?.topics ?? [];
  const found = typeId && catalog.data ? findType(catalog.data, typeId) : null;
  const counts = counters.data;

  return (
    <>
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
        <MyRequestsPanel full extraCategories={extraCategories} category={search.get('cat')} onCategory={(cat) => setParams({ cat })} bucket={search.get('bucket')} onBucket={(bucket) => setParams({ bucket })} sent={search.get('sent')} onSentSeen={() => setParams({ sent: null })} />
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
            ) : catalog.isError && catalog.error?.denied ? (
              // the server does not (yet) let this role open requests: a calm note, not an error
              <section className="card"><EmptyState title="פתיחת קריאות עדיין אינה זמינה לתפקיד שלך">אפשר לעקוב כאן אחר הקריאות שלך. האפשרות לפתוח קריאות תתווסף בקרוב.</EmptyState></section>
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
          <MyRequestsPanel extraCategories={extraCategories} category={search.get('cat')} onCategory={(cat) => setParams({ cat })} onAll={() => go({ rq: 'mine', cat: search.get('cat') })} />
        </div>
      </FadeIn>
    )}
    </>
  );
}
