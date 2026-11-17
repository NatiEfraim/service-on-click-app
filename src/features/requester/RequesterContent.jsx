'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { CategoryGroup } from '@/components/booking/CategoryGroup';
import { Icon } from '@/components/ui/Icon';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { MyRequestsPanel } from './MyRequestsPanel';
import { RequestForm } from './RequestForm';
import { counterOf, findType } from './requesterData';
import { isChanged, rememberFirstVisit, useSeen } from './seen';
import { useCatalog, useCounters, useMyRequests } from './useRequester';
import './requester.css';
import { TypePicture } from '@/components/booking/TypePicture';
import { Reveal } from '@/components/ui/Reveal';
import { useToggleSet } from '@/lib/useToggleSet';

const COUNTERS = [
  { id: 'open', label: 'קריאות פתוחות', icon: 'inbox' },
  { id: 'action', label: 'נדרשת פעולה ממך', icon: 'alert' },
  { id: 'handling', label: 'בטיפול אצל גורם', icon: 'sync' },
  { id: 'done', label: 'הושלמו', icon: 'check' },
];


/**
 * Where the requester screen is (home / "הקריאות שלי" / a form), from the URL (`?rq=`, `?type=<booking type id>`),
 * and how to move: `go` pushes a history entry, so Back works. Shared by the content and the regular user's top bar.
 */
/**
 * A topic's card (ביטחון מידע, תקשוב): its head folds it, its body lists the request types by group. The card ends at
 * the bottom of the window and only its body scrolls (useFitToWindow, scroll bar on the right), so a long topic never
 * makes the page itself scroll.
 */
function TopicCard({ topic, open, onToggle, onOpenType }) {
  const card = useRef(null);
  // capped at the window's bottom open or closed: lifting the cap at once on closing let the still-open body stretch
  // the card (and the page, and the footer) for a moment before it folded
  useFitToWindow(card, 240);
  // the sub-groups of more than one type fold like the categories of "הקריאות שלי" (CategoryGroup); all closed at first
  const [openGroups, toggleGroup] = useToggleSet();
  const typeButton = (type) => (
    <button key={type.id} type="button" className="rq-type" onClick={() => onOpenType(type.id)}>
      <TypePicture typeId={type.id} src={type.img} />
      <span className="txt">
        <b>{type.name}</b>
        {type.description ? <span>{type.description}</span> : null}
      </span>
      <Icon name="left" className="go" />
    </button>
  );
  const count = topic.groups.reduce((sum, group) => sum + group.types.length, 0);
  return (
    <section ref={card} className={`card rq-topic fit-card${open ? '' : ' closed'}`} aria-label={topic.name}>
      <button type="button" className="rq-topic-head" aria-expanded={open} onClick={onToggle}>
        <span className="pic"><TypePicture src={topic.img} /></span>
        <span className="txt">
          <b>{topic.name}</b>
          <span>{count} סוגי קריאות</span>
        </span>
        <Icon name="down" className="chev" />
      </button>
      {/* stays mounted so it folds open and closed smoothly, fading as it goes (grid rows 0fr ↔ 1fr); inert while closed */}
      <Reveal open={open} className="rq-topic-reveal" innerClassName="fit-fill scroll-y rq-topic-scroll">
        <div className="rq-topic-body">
          {topic.groups.map((group) =>
            group.types.length > 1 ? (
              // a group of more than one request type folds open and closed in its own box
              <CategoryGroup
                key={group.id}
                section={{ id: `g${group.id}`, label: group.name }}
                className="rq-subgroup"
                summary={`${group.types.length} סוגי קריאות`}
                open={openGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              >
                <div className="rq-types">{group.types.map(typeButton)}</div>
              </CategoryGroup>
            ) : (
              // a single type stays plain, under its group's name
              <div key={group.id} className="rq-group">
                <h3>{group.name}</h3>
                <div className="rq-types">{group.types.map(typeButton)}</div>
              </div>
            ),
          )}
        </div>
      </Reveal>
    </section>
  );
}

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
  const mine = useMyRequests();
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
          <RequestForm found={found} onHome={() => go({})} onDone={({ serial, uuid }) => go({ rq: 'mine', sent: serial || null, open: uuid || null })} />
        ) : (
          <EmptyState title="סוג הקריאה אינו זמין לך">
            ייתכן שאין לך הרשאה לפתוח אותו, או שהוא אינו פעיל ביחידה שלך.{' '}
            <button type="button" className="rq-link" onClick={() => go({})}>חזרה לדף הבית</button>
          </EmptyState>
        )}
      </FadeIn>
    ) : view === 'mine' ? (
      <FadeIn key="mine">
        <MyRequestsPanel full extraCategories={extraCategories} category={search.get('cat')} onCategory={(cat) => setParams({ cat })} bucket={search.get('bucket')} onBucket={(bucket) => setParams({ bucket })} sent={search.get('sent')} onSentSeen={() => setParams({ sent: null })} openId={search.get('open')} onOpened={() => setParams({ open: null })} />
      </FadeIn>
    ) : (
      <div key="home">
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
                {/* its line is always there (empty until the requests load), so the card never grows when it appears */}
                <span className={`rq-changed-count${changedIn(counter.id) ? '' : ' is-empty'}`} aria-hidden={changedIn(counter.id) ? undefined : true}>
                  {changedIn(counter.id) ? `${changedIn(counter.id)} עודכנו מאז הביקור האחרון` : ' '}
                </span>
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
                return (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    open={open}
                    onToggle={() => setClosed((previous) => (open ? [...previous, topic.id] : previous.filter((id) => id !== topic.id)))}
                    onOpenType={openType}
                  />
                );
              })
            )}
          </div>
          <MyRequestsPanel extraCategories={extraCategories} category={search.get('cat')} onCategory={(cat) => setParams({ cat })} onAll={() => go({ rq: 'mine', cat: search.get('cat') })} />
        </div>
      </div>
    )}
    </>
  );
}
