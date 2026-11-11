'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { Chip, StatusChip } from '@/components/ui/Chips';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Seg } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/SearchField';
import { OPEN_STATUS_IDS } from '@/lib/api/endpoints';
import { useDebounced } from '@/lib/useDebounced';
import { useFitToWindow } from '@/lib/useFitToWindow';
import { RequestDrawer } from './RequestDrawer';
import { fetchMyRequests, fetchPermittedCategories, PROGRESS_STEPS, requestProgress, STATUS_LABEL } from './requesterData';

const STATUS_TONE = { action: 'warn', handling: 'info', done: 'ok' };

/** Requests the home's side panel lists before "הצג עוד" (the full page lists them all). */
const PANEL_ROWS = 5;

/** Still open: a demo request until done, a real one by its status (the open statuses the API filters by). */
const isOpen = (row) => (row.status ? row.status !== 'done' : OPEN_STATUS_IDS.includes(row.statusId));

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

/** The status name a row shows (demo or real). */
const statusNameOf = (row) => (row.status ? STATUS_LABEL[row.status] : row.statusName);

/**
 * "הקריאות שלי": an icon and name for every category the user may open requests in (the new topics and the service
 * domains); picking one lists their requests in it. `full` is the whole-page version, otherwise the home's side panel.
 */
export function MyRequestsPanel({ full = false, category, onCategory, onAll }) {
  const categories = useQuery({ queryKey: ['requester-demo', 'categories'], queryFn: ({ signal }) => fetchPermittedCategories(signal) });
  const list = categories.data ?? [];
  const current = list.find((candidate) => candidate.id === category) ?? null;
  const requests = useQuery({
    queryKey: ['requester-demo', 'requests', current?.id ?? 'all'],
    queryFn: ({ signal }) => fetchMyRequests(current?.id ?? null, signal),
    enabled: categories.isSuccess,
  });
  // the full page filters (open / all, search by number or category), as the earlier "הקריאות שלי" screen did
  const [view, setView] = useState('all');
  // the request open in the side panel
  const [opened, setOpened] = useState(null);
  // the full page ends at the window's bottom: only the list scrolls, never the page
  const card = useRef(null);
  useFitToWindow(card, 320, full);
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 200);
  // the full page's "סינון" panel, as in the management requests screen: category, step, status, opening dates
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: null, to: null });
  const allRows = requests.data ?? [];
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
          (stage === '' || requestProgress(row.statusId, row.status).step === Number(stage)) &&
          (!status || statusNameOf(row) === status) &&
          inRange(row),
      )
    : allRows;
  const advanced = (current ? 1 : 0) + (stage !== '' ? 1 : 0) + (status ? 1 : 0) + (range.from || range.to ? 1 : 0);
  const clearFilters = () => {
    onCategory(null);
    setStage('');
    setStatus('');
    setRange({ from: null, to: null });
  };
  const [sort, setSort] = useState('new');
  const sortBy = SORTS.find((option) => option.value === sort) ?? SORTS[0];
  const rows = full ? [...filtered].sort(sortBy.compare) : allRows.slice(0, PANEL_ROWS);

  return (
    <section ref={card} className={`card rq-mine${full ? ' full fit-card' : ''}`} aria-label="הקריאות שלי">
      <div className="rq-mine-head">
        <h2>הקריאות שלי</h2>
        {onAll ? (
          <button type="button" className="rq-link" onClick={onAll}>
            לכל הקריאות
            <Icon name="left" />
          </button>
        ) : null}
      </div>
      {full ? null : (
      <div className="rq-cats" role="group" aria-label="קטגוריות">
        <button type="button" className="rq-cat" aria-pressed={!current} onClick={() => onCategory(null)}>
          <span className="ic"><Icon name="list" /></span>
          הכל
        </button>
        {list.map((item) => (
          <button key={item.id} type="button" className="rq-cat" aria-pressed={current?.id === item.id} onClick={() => onCategory(item.id)}>
            <span className="ic pic"><img src={item.img} alt="" /></span>
            {item.name}
          </button>
        ))}
      </div>
      )}
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
            {advanced ? <Button size="sm" variant="ghost" icon="x" className="requests-clear" aria-label="ניקוי הסינון" data-tip="ניקוי הסינון" onClick={clearFilters} /> : null}
          </div>
          <span className="grow" />
          {requests.isSuccess ? <span className="small muted">{rows.length} קריאות</span> : null}
          <div className="requests-sort-control">
            <label className="small muted" htmlFor="rq-sort">מיון</label>
            <Select autoWidth id="rq-sort" className="input requests-sort-select" style={{ paddingBlock: 5 }} value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        </div>
        {/* stays mounted so it can fold both ways (as in the management screen); inert while closed */}
        <div className={`adv-wrap${filtersOpen ? ' open' : ''}`} inert={!filtersOpen}>
          <div className="adv requests-filters">
            <Field label="תחום">
              <Select autoWidth className="input" value={current?.id ?? ''} onChange={(event) => onCategory(event.target.value || null)}>
                <option value="">כל התחומים</option>
                {list.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="שלב">
              <Select autoWidth className="input" value={stage} onChange={(event) => setStage(event.target.value)}>
                <option value="">כל השלבים</option>
                {PROGRESS_STEPS.map((name, index) => <option key={name} value={index}>{name}</option>)}
              </Select>
            </Field>
            <Field label="סטטוס">
              <Select autoWidth className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">כל הסטטוסים</option>
                {statusNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </Select>
            </Field>
            {/* a div, not Field's <label>: a click on the open calendar must not be forwarded to its button */}
            <div className="field">
              <span>תאריך פתיחה</span>
              <DateRangePicker label="" value={range} onChange={(next) => setRange({ from: next.from, to: next.to })} />
            </div>
          </div>
        </div>
        </>
      ) : null}
      {categories.isPending || requests.isPending ? (
        <div className="card-body"><Loading rows={3} /></div>
      ) : requests.isError ? (
        <ErrorNotice error={requests.error} title="לא ניתן להציג את הקריאות." onRetry={() => void requests.refetch()} />
      ) : rows.length ? (
        <>
        <ul className="rq-list">
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className="rq-row" onClick={() => setOpened(row)} aria-label={`פרטי קריאה ${row.serial}`}>
              <div>
                <b>{row.typeName}</b> <span className="serial">{row.serial}</span>
                <div className="small muted">נפתחה {row.createdAt}</div>
              </div>
              {row.status ? <Chip tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Chip> : <StatusChip statusId={row.statusId} label={row.statusName} />}
              </button>
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
        full && allRows.length ? (
        <EmptyState title={query ? 'לא נמצאו קריאות התואמות לחיפוש' : 'אין לך קריאות פתוחות'}>{query ? 'נסה מספר קריאה או קטגוריה אחרים, או נקה את החיפוש.' : 'לכל הקריאות, כולל סגורות, בחר הכל.'}</EmptyState>
      ) : (
        <EmptyState title={current ? `אין לך קריאות ב${current.name}` : 'עוד לא פתחת קריאות'}>בחר סוג קריאה כדי לפתוח קריאה ראשונה</EmptyState>
      )
      )}
      {opened ? <RequestDrawer row={opened} rows={rows} onGo={setOpened} onClose={() => setOpened(null)} /> : null}
    </section>
  );
}
