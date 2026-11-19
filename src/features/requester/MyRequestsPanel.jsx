'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { ClearFilters } from '@/components/ui/ClearFilters';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { CategoryGroup, groupBySection, sectionOf } from '@/components/booking/CategoryGroup';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon } from '@/components/ui/Icon';
import { Seg } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/SearchField';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { usePresence } from '@/components/ui/usePresence';
import { OPEN_STATUS_IDS } from '@/lib/api/endpoints';
import { EASE_IN_OUT, EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { useDebounced } from '@/lib/useDebounced';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { RequestDrawer } from './RequestDrawer';
import { RequestRow } from './RequestRow';
import { RowBridge } from './RowBridge';
import { celebrationKey, isChanged, markCelebrated, markSeen, useSeen, wasCelebrated } from './seen';
import { counterOf, requestCategories, stageOf } from './requesterData';
import { STAGE_SHORT } from '@/lib/labels';
import { ROUTE_STAGE_ORDER } from '@/lib/routeTypes';
import { useCatalog, useMyRequests } from './useRequester';
import { TypePicture } from '@/components/booking/TypePicture';
import { domainIconSrc } from '@/lib/labels';
import { CategoryArtwork, playCategoryArtwork } from '@/components/booking/CategoryArtwork';
import { Reveal } from '@/components/ui/Reveal';
import { useToggleSet } from '@/lib/useToggleSet';

/** The home counters, as a filter on the full page (?bucket=): a counter's click lands here with it chosen. */
const BUCKETS = [
  { id: 'open', label: 'קריאות פתוחות' },
  { id: 'action', label: 'נדרשת פעולה ממך' },
  { id: 'handling', label: 'בטיפול אצל גורם' },
  { id: 'done', label: 'הושלמו' },
];
const inBucket = (row, bucket) => (bucket === 'open' ? ['action', 'handling'].includes(counterOf(row)) : counterOf(row) === bucket);

/** How long "סימון הכל כנקרא" takes to fade out (matches .rq-mark-all[data-closing] in requester.css). */
const MARK_ALL_EXIT_MS = 220;

/** Requests the home's side panel lists before "הצג עוד" (the full page lists them all). */
const PANEL_ROWS = 5;

/** Still open, by its status (the open statuses the API filters by). */
const isOpen = (row) => OPEN_STATUS_IDS.includes(row.statusId);

/** Every word of the search is in the request's number or its category name. */
const matches = (row, query) => {
  const text = `${row.serial ?? ''} ${row.typeName ?? ''}`.toLocaleLowerCase('he');
  return query.toLocaleLowerCase('he').split(/\s+/).filter(Boolean).every((term) => text.includes(term));
};

/** A request's opening day as YYYY-MM-DD (the server sends dd/mm/yyyy or an ISO date), to compare with the date filter. */
function dayOf(value) {
  const text = String(value ?? '');
  const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return iso ? iso[1] : '';
}

/** Opening day, then the request number, so requests of the same day keep a steady order. */
const byOpened = (a, b) => dayOf(a.createdAt).localeCompare(dayOf(b.createdAt)) || String(a.serial).localeCompare(String(b.serial), undefined, { numeric: true });

/** The full page's sort choices (as the management requests screen's "מיון"). */
const SORTS = [
  { value: 'new', label: 'החדשות קודם', compare: (a, b) => byOpened(b, a) },
  { value: 'old', label: 'הישנות קודם', compare: byOpened },
  { value: 'type', label: 'לפי תחום', compare: (a, b) => (a.typeName ?? '').localeCompare(b.typeName ?? '', 'he') || byOpened(b, a) },
  { value: 'status', label: 'לפי סטטוס', compare: (a, b) => (statusNameOf(a) ?? '').localeCompare(statusNameOf(b) ?? '', 'he') || byOpened(b, a) },
];

/** The status name a row shows. */
const statusNameOf = (row) => row.statusName;

/**
 * "הקריאות שלי": an icon and name for every category the user has an open request in (of those the user may open
 * or manage); picking one lists their requests in it. `full` is the whole-page version, otherwise the home's side panel.
 */
/**
 * The home's list height glide: an ease-in-out over 320ms. The card is capped at the window, so a longer list shows only
 * the start of its glide; a strong ease-out would make the card's edge leap there, this starts gently.
 */
function HomeGlide({ paused = false, children }) {
  return <SmoothSize easing={EASE_IN_OUT} duration={320} paused={paused}>{children}</SmoothSize>;
}

/** How long an opened row takes to grow apart from its neighbours (requester.css: .rq-ticket's margin, 260ms). */
const SELECTED_GROW_MS = 270;

/** The room an opened row needs below its current bottom: it grows 12px above and below (.rq-row.selected), plus 16px. */
const SELECTED_ROOM = 40;

/** How long the shown list takes to fade out before another category's list replaces it (requester.css: .rq-swap). */
const SWAP_OUT_MS = 200;

/** The home's list, fading out and in as the category changes (`out`: fading out). */
function SwapBox({ out, children }) {
  return <div className="rq-swap" data-out={out || undefined}>{children}</div>;
}

/**
 * The home's body under the head: the categories and the list scroll together inside the window-fitted card (as a
 * topic card's list does), so the page itself never scrolls; the head stays in place.
 */
function HomeScrollBody({ children }) {
  return <div className="fit-fill scroll-y rq-mine-scroll">{children}</div>;
}

function SentNotice({ sent, closing, onDismiss, onClosed }) {
  const slot = useRef(null);
  const animation = useRef(null);

  useEffect(() => () => {
    animation.current?.cancel();
    animation.current = null;
  }, []);

  const dismiss = async () => {
    const element = slot.current;
    if (!element || animation.current) return;

    const reduced = prefersReducedMotion();
    const fadeDuration = reduced ? 180 : 220;
    const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: fadeDuration,
      easing: EASE_OUT,
      fill: 'forwards',
    });
    animation.current = fade;
    onDismiss();

    try {
      await fade.finished;
      const collapse = element.animate(
        [{ height: `${element.getBoundingClientRect().height}px` }, { height: '0px' }],
        { duration: reduced ? 180 : 280, easing: EASE_IN_OUT, fill: 'forwards' },
      );
      animation.current = collapse;
      await collapse.finished;
      onClosed();
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  };

  return (
    <div ref={slot} className="rq-sent-slot" inert={closing}>
      <Notice tone="ok" className="rq-sent" action={<Button size="sm" variant="ghost" icon="x" aria-label="סגירה" onClick={dismiss} />}>
        הקריאה נשלחה בהצלחה. מספר הקריאה: <b className="serial">{sent}</b>
      </Notice>
    </div>
  );
}

export function MyRequestsPanel({ full = false, extraCategories = null, category, onCategory, bucket: rawBucket = null, onBucket = () => {}, sent = null, onSentSeen = () => {}, onAll, openId = null, onOpened = () => {} }) {
  const bucket = BUCKETS.some((option) => option.id === rawBucket) ? rawBucket : null;
  // Keep the notice on screen during its exit even though the URL is cleared immediately.
  const [closingSent, setClosingSent] = useState(null);
  const noticeSerial = sent ?? closingSent;
  // the categories (topics and domains) come from GET /requester/catalog, already limited to what the user may open
  const categories = useCatalog();
  const requests = useMyRequests({ openOnly: !full });
  // the home: the categories and the list scroll together (HomeScrollBody); the list's height glides (SmoothSize)
  const Body = full ? Fragment : HomeScrollBody;
  const ListBox = full ? Fragment : HomeGlide;
  const Swap = full ? Fragment : SwapBox;
  // switching category on the home: the shown list fades out, then the new one fades in as the card glides to its new
  // height (SmoothSize) - instead of the list and the card snapping
  // The new category arrives through the address (~100ms after it is asked for): the list fades out, only then is the
  // category asked for, and the list stays faded until it has really arrived. The scroll stays where it is.
  const [pending, setPending] = useState(undefined);
  const swapping = pending !== undefined;
  const swapTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(swapTimer.current), []);
  // the asked-for category has arrived: the new list fades in (as the card glides to its new height - SmoothSize)
  if (swapping && (category ?? null) === pending) setPending(undefined);
  const pick = (id) => {
    if (id === (current?.id ?? null)) return;
    if (full || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCategory(id);
      return;
    }
    setPending(id);
    window.clearTimeout(swapTimer.current);
    // the scroll stays where it is: switching categories never takes the panel back to its top (a shorter list only
    // brings it up as far as that list reaches, while the list is faded out)
    swapTimer.current = window.setTimeout(() => onCategory(id), SWAP_OUT_MS);
    // never left faded if the address does not change (the same category asked again)
    window.setTimeout(() => setPending((now) => (now === id ? undefined : now)), SWAP_OUT_MS + 1500);
  };
  const ownedRows = requests.data ?? [];
  const openTypeIds = new Set(ownedRows.filter(isOpen).map((row) => row.bookingTypeId));
  const list = requestCategories(ownedRows, categories.data?.categories, extraCategories ?? []);
  // a ביטחון מידע / תקשוב type's own picture (by booking type id); other domains show their domain badge
  const typeImg = Object.fromEntries((categories.data?.topics ?? []).flatMap((topic) => topic.groups.flatMap((group) => group.types.map((type) => [type.id, type.img]))));
  // every category the user may use (the requester catalog, the domains they manage, and any of their own requests'),
  // split into the three main categories - as in the permissions window (CategoryGroup)
  const current = list.find((candidate) => candidate.id === category) ?? null;
  const sections = groupBySection(list, (item) => item.typeIds[0]);
  // how many of the user's own requests are open in a category (the small red number on its icon)
  const openIn = (item) => ownedRows.filter((row) => isOpen(row) && item.typeIds.includes(row.bookingTypeId)).length;
  // the main categories that are open; the one holding the chosen category starts open
  const [openSections, toggleSection] = useToggleSet(() => (current ? [sectionOf(current.typeIds[0])] : []));
  // the full page filters (open / all, search by number or category), as the earlier "הקריאות שלי" screen did
  const [view, setView] = useState('all');
  // the request open in the side panel
  const [opened, setOpened] = useState(null);
  // "changed since your last visit": opening a request marks it as seen in its current status
  const seen = useSeen();
  const open = (row, event) => {
    markSeen([row]);
    // clicked in the list: the list starts gliding at once by the room the row will need when grown (its margin above
    // and below plus its scroll margin), so the row grows straight into view instead of being corrected afterwards
    const element = event?.currentTarget?.closest?.('.rq-row');
    const scroller = element?.closest('.rq-mine-scroll, .rq-list');
    if (element && scroller) {
      const need = element.getBoundingClientRect().bottom + SELECTED_ROOM - scroller.getBoundingClientRect().bottom;
      if (need > 0) scroller.scrollBy({ top: need, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    setOpened(row);
  };
  // while a request is open its list stays put (its row sits above the dimming, joined to the side panel): the wheel and
  // touch scrolling are held from script - not overflow: hidden, which would stop the glide that shows the opened row
  useEffect(() => {
    if (!opened) return undefined;
    const scroller = card.current?.querySelector(full ? '.rq-list' : '.rq-mine-scroll');
    if (!scroller) return undefined;
    const hold = (event) => event.preventDefault();
    scroller.addEventListener('wheel', hold, { passive: false });
    scroller.addEventListener('touchmove', hold, { passive: false });
    return () => {
      scroller.removeEventListener('wheel', hold);
      scroller.removeEventListener('touchmove', hold);
    };
  }, [Boolean(opened), full]); // eslint-disable-line react-hooks/exhaustive-deps
  // an opened row grows (room above and below it, so it stands apart): one near the end of a scrolled list would then be
  // cut by the card's edge, so once it has grown the list glides just enough to show it whole (scroll-margin: its room)
  useEffect(() => {
    if (!opened) return undefined;
    const timer = window.setTimeout(() => {
      card.current?.querySelector('.rq-row.selected')?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, SELECTED_GROW_MS);
    return () => window.clearTimeout(timer);
  }, [opened?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the full page ends at the window's bottom: only the list scrolls, never the page
  const card = useRef(null);
  // the list is locked while a request is open (styles); a request reached with the stepper is brought into view
  useEffect(() => {
    if (!opened) return;
    card.current?.querySelector('.rq-row.selected')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [opened]);
  // both the home and the full page end at the window's bottom: only the list scrolls, never the page
  useFitToWindow(card, 320);
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 200);
  // the full page's "סינון" panel, as in the management requests screen: category, step, status, opening dates
  // arriving from a home counter: the filters open, so the chosen "מצב" is in view
  const [filtersOpen, setFiltersOpen] = useState(() => Boolean(bucket));
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: null, to: null });
  // a booking to open as soon as the list has it (the one just sent: ?open=<uuid> - the requester API's key)
  useEffect(() => {
    if (!openId || !requests.isSuccess) return;
    const row = ownedRows.find((candidate) => candidate.id === openId);
    if (row) open(row);
    onOpened();
  }, [openId, requests.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps
  // the request just sent (?sent=<serial>) slides in and glows once; after that it is an ordinary row (no replay when
  // the list re-renders or a filter brings it back)
  const [arrived, setArrived] = useState(null);
  // its slot is a grid only while it opens (requester.css rq-arrive-slot); after that the row is laid out as any other,
  // so opening it (the row grows past its box) is not squeezed
  const [slotOpened, setSlotOpened] = useState(null);
  const arriving = (row) => full && sent != null && String(row.serial) === String(sent) && arrived !== String(sent);
  const allRows = ownedRows.filter((row) => (full || isOpen(row)) && (!current || current.typeIds.includes(row.bookingTypeId)));
  const changedRows = allRows.filter((row) => isChanged(seen, row));
  // Keep an update queued even when opening the drawer marks it as seen.
  const [celebrated, setCelebrated] = useState(() => new Set());
  const [due, setDue] = useState(() => new Set());
  const newlyDue = changedRows
    .map(celebrationKey)
    .filter((key) => !due.has(key) && !celebrated.has(key) && !wasCelebrated(key));
  if (newlyDue.length) setDue(new Set([...due, ...newlyDue]));
  const celebrating = (row) => {
    const key = celebrationKey(row);
    return due.has(key) && !celebrated.has(key) && !wasCelebrated(key);
  };
  const finishCelebration = (row) => {
    const key = celebrationKey(row);
    markCelebrated(key);
    setCelebrated((previous) => new Set(previous).add(key));
    setDue((previous) => new Set([...previous].filter((candidate) => candidate !== key)));
  };
  // "סימון הכל כנקרא" fades out instead of vanishing (as the management "ניקוי הסינון"), keeping its last count meanwhile
  const markAll = usePresence(changedRows.length > 0, MARK_ALL_EXIT_MS);
  const [markAllCount, setMarkAllCount] = useState(changedRows.length);
  if (changedRows.length && changedRows.length !== markAllCount) setMarkAllCount(changedRows.length);
  // the approval route's stages, then the clearance grant's own steps (lib/routeTypes), then closed
  const STAGE_ORDER = ['control_officer', 'vice_approver', 'approver', 'supplier_files', 'supplier_approval', 'supplier_number', 'barber', 'realization', ...ROUTE_STAGE_ORDER, 'closed'];
  const stageOptions = STAGE_ORDER.filter((id) => allRows.some((row) => stageOf(row.statusId, row.bookingTypeId) === id));
  const statusNames = [...new Set(allRows.map(statusNameOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
  const inRange = (row) => {
    if (!range.from && !range.to) return true;
    const day = dayOf(row.createdAt);
    return Boolean(day) && (!range.from || day >= range.from) && (!range.to || day <= range.to);
  };
  const filtered = full
    ? allRows.filter(
        (row) =>
          (view === 'all' || isOpen(row)) &&
          matches(row, query) &&
          (!bucket || inBucket(row, bucket)) &&
          (stage === '' || stageOf(row.statusId, row.bookingTypeId) === stage) &&
          (!status || statusNameOf(row) === status) &&
          inRange(row),
      )
    : allRows;
  const advanced = (bucket ? 1 : 0) + (current ? 1 : 0) + (stage !== '' ? 1 : 0) + (status ? 1 : 0) + (range.from || range.to ? 1 : 0);
  const clearFilters = () => {
    onBucket(null);
    onCategory(null);
    setStage('');
    setStatus('');
    setRange({ from: null, to: null });
  };
  const [sort, setSort] = useState('new');
  const sortBy = SORTS.find((option) => option.value === sort) ?? SORTS[0];
  const sorted = full ? [...filtered].sort(sortBy.compare) : allRows.slice(0, PANEL_ROWS);
  // the request just sent leads the list: request numbers are not in opening order, so within today's requests the sort
  // alone could place it anywhere
  const sentIndex = full && noticeSerial != null ? sorted.findIndex((row) => String(row.serial) === String(noticeSerial)) : -1;
  const rows = sentIndex > 0 ? [sorted[sentIndex], ...sorted.slice(0, sentIndex), ...sorted.slice(sentIndex + 1)] : sorted;

  return (
    <section ref={card} className={`card rq-mine fit-card${full ? ' full' : ''}`} aria-label="הקריאות שלי">
      <div className="rq-mine-head">
        {/* two fixed sides: the title with "הכל" beside it, and the actions at the end - so the mark-all button coming and
            going never moves anything else */}
        <div className="rq-mine-title">
        <h2>הקריאות שלי</h2>
        {full ? null : (
          // every category at once: beside the title, so the categories below take less room
          <button type="button" className="rq-all-pill" aria-pressed={!current} onClick={() => pick(null)}>
            <Icon name="list" />
            הכל
          </button>
        )}
        </div>
        <div className="rq-mine-actions">
        {/* only while something changed since the last visit; clears every highlight in the list shown */}
        {!full && markAll.mounted ? (
          <Button size="sm" variant="ghost" icon="check" className="rq-mark-all" data-closing={markAll.closing || undefined} disabled={markAll.closing} onClick={() => markSeen(changedRows)}>
            סימון הכל כנקרא ({markAllCount})
          </Button>
        ) : null}
        {onAll ? (
          <button type="button" className="rq-link" onClick={onAll}>
            לכל הקריאות
            <Icon name="left" />
          </button>
        ) : null}
        </div>
      </div>
      <Body>
      {full ? null : (
      <div className="rq-cat-groups" role="group" aria-label="קטגוריות">
        {sections.map((section) => {
          const withOpen = section.items.filter((item) => item.typeIds.some((id) => openTypeIds.has(id))).length;
          const sectionOpen = section.items.reduce((sum, item) => sum + openIn(item), 0);
          return (
            <CategoryGroup
              key={section.id}
              section={section}
              className={current && sectionOf(current.typeIds[0]) === section.id ? 'holds-current' : ''}
              open={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              count={sectionOpen}
              countLabel={`${sectionOpen} קריאות פתוחות ב${section.label}`}
              summary={`${section.items.length} קטגוריות${withOpen ? ` · ${withOpen} עם קריאות פתוחות` : ''}`}
            >
              <div className="rq-cats">
                {section.items.map((item, index) => (
                  <button key={item.id} type="button" className="rq-cat" style={{ '--i': index }} aria-pressed={current?.id === item.id} onClick={(event) => {
                    // an animated picture plays in full by itself on the click (playOn="click"); a TypeIcon picture is played here
                    if (!event.currentTarget.querySelector('.category-artwork')) playCategoryArtwork(event.currentTarget);
                    pick(item.id);
                  }}>
                    {/* hover gives only a small taste of the picture's sequence; the click plays it in full */}
                    <span className="ic pic"><CountBadge count={openIn(item)} label={`${openIn(item)} קריאות פתוחות ב${item.name}`} /><CategoryArtwork src={item.img ?? domainIconSrc(item.typeIds[0])} size={32} playOn="click" fallback={<TypePicture typeId={item.typeIds[0]} src={item.img} size={32} playOn="click" />} /></span>
                    {item.name}
                  </button>
                ))}
              </div>
            </CategoryGroup>
          );
        })}
      </div>
      )}
      {full && noticeSerial ? (
        <SentNotice
          key={noticeSerial}
          sent={noticeSerial}
          closing={noticeSerial === closingSent}
          onDismiss={() => {
            setClosingSent(noticeSerial);
            onSentSeen(noticeSerial);
          }}
          onClosed={() => setClosingSent(null)}
        />
      ) : null}
      {full ? (
        <>
        <div className="toolbar rq-toolbar">
          <Seg label="תצוגה" value={view} onChange={setView} options={[{ value: 'all', label: 'הכל' }, { value: 'open', label: 'פתוחות' }]} />
          <SearchField width={260} value={search} onChange={setSearch} placeholder="מספר קריאה או קטגוריה" aria-label="חיפוש בקריאות שלי לפי מספר קריאה או קטגוריה" />
          {/* as in the management requests screen: the filter button with a small square clear button beside it */}
          <div className="requests-filter-actions">
            <Button size="sm" icon="sliders" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
              <AnimatedText>{advanced ? `סינון (${advanced})` : 'סינון'}</AnimatedText>
            </Button>
            {advanced ? <ClearFilters onClick={clearFilters} /> : null}
            {markAll.mounted ? (
              <Button size="sm" variant="ghost" icon="check" className="rq-mark-all" data-closing={markAll.closing || undefined} disabled={markAll.closing} onClick={() => markSeen(changedRows)}>
                סימון הכל כנקרא ({markAllCount})
              </Button>
            ) : null}
          </div>
          <span className="grow" />
          {requests.isSuccess ? <span className="small muted">{rows.length} קריאות</span> : null}
          <div className="requests-sort-control">
            <label className="small muted" htmlFor="rq-sort">מיון</label>
            <Select autoWidth id="rq-sort" className="input requests-sort-select" style={{ paddingBlock: 5 }} value={sort} onChange={(event) => setSort(event.target.value)} options={SORTS} />
          </div>
        </div>
        {/* stays mounted so it can fold both ways (as in the management screen); inert while closed */}
        <Reveal open={filtersOpen} className="adv-wrap" innerClassName="adv requests-filters">
          <Field label="תחום">
            <Select autoWidth className="input" value={current?.id ?? ''} onChange={(event) => onCategory(event.target.value || null)} all="כל התחומים" options={list} optionLabel={(item) => item.name} />
          </Field>
          <Field label="מצב">
            <Select autoWidth className="input" value={bucket ?? ''} onChange={(event) => onBucket(event.target.value || null)} all="כל המצבים" options={BUCKETS} />
          </Field>
          <Field label="שלב">
            <Select autoWidth className="input" value={stage} onChange={(event) => setStage(event.target.value)} all="כל השלבים" options={stageOptions} optionLabel={(id) => STAGE_SHORT[id]} />
          </Field>
          <Field label="סטטוס">
            <Select autoWidth className="input" value={status} onChange={(event) => setStatus(event.target.value)} all="כל הסטטוסים" options={statusNames} />
          </Field>
          <Field as="div" label="תאריך פתיחה">
            <DateRangePicker label="" value={range} onChange={(next) => setRange({ from: next.from, to: next.to })} />
          </Field>
        </Reveal>
        </>
      ) : null}
      {/* the home: switching category glides the card to its new height (SmoothSize) instead of snapping; the full page
          keeps its window-fitted list */}
      {/* paused while a request is open: the opened row grows past its box on purpose, and a glide would clip it */}
      <ListBox {...(full ? {} : { paused: Boolean(opened) })}>
      <Swap {...(full ? {} : { out: swapping })}>
      {categories.isPending || requests.isPending ? (
        <div className="card-body"><Loading rows={3} /></div>
      ) : requests.isError ? (
        <ErrorNotice error={requests.error} title="לא ניתן להציג את הקריאות." onRetry={() => void requests.refetch()} />
      ) : rows.length ? (
        <>
        <ul className="rq-list">
          {rows.map((row) => (
            <li
              key={row.id}
              className={arriving(row) && slotOpened !== String(sent) ? 'arriving' : undefined}
              onAnimationEnd={(event) => event.target === event.currentTarget && event.animationName === 'rq-arrive-slot' && setSlotOpened(String(sent))}
            >
              <RequestRow
                row={row}
                img={typeImg[row.bookingTypeId]}
                changed={isChanged(seen, row)}
                selected={opened?.id === row.id}
                celebrating={celebrating(row) ? celebrationKey(row) : null}
                arriving={arriving(row)}
                onArrived={() => setArrived(String(sent))}
                onOpen={(event) => open(row, event)}
                onCelebrated={() => finishCelebration(row)}
              />
            </li>
          ))}
        </ul>
        {!full && allRows.length > rows.length && onAll ? (
          <button type="button" className="btn sm rq-more" onClick={onAll}>
            הצג עוד ({allRows.length - rows.length})
            <Icon name="left" />
          </button>
        ) : null}
        </>
      ) : (
        !full ? <EmptyState title="אין לך קריאות פתוחות" /> : allRows.length ? (
        <EmptyState title={query ? 'לא נמצאו קריאות התואמות לחיפוש' : 'אין לך קריאות פתוחות'}>{query ? 'נסה מספר קריאה או קטגוריה אחרים, או נקה את החיפוש.' : 'לכל הקריאות, כולל סגורות, בחר הכל.'}</EmptyState>
      ) : (
        <EmptyState title={current ? `אין לך קריאות ב${current.name}` : 'עוד לא פתחת קריאות'}>בחר סוג קריאה כדי לפתוח קריאה ראשונה</EmptyState>
      )
      )}
      </Swap>
      </ListBox>
      </Body>
      {opened ? <RowBridge key={opened.id} /> : null}
      {opened ? <RequestDrawer row={opened} rows={rows} onGo={open} onClose={() => setOpened(null)} celebrate={celebrating(opened) ? celebrationKey(opened) : null} onCelebrated={() => finishCelebration(opened)} /> : null}
    </section>
  );
}
