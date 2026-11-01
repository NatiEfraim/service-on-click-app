import type { BookingListParams } from '@/lib/api/endpoints';

/** The screen's quick views. Each one is a fixed combination of the API's filters. */
export type ViewId = 'open' | 'mine' | 'overdue' | 'decide' | 'all';
export type SortKey = NonNullable<BookingListParams['sort']>;

export interface RequestFilters {
  view: ViewId;
  q: string;
  types: string;
  stage: string;
  statuses: string;
  units: string;
  handler: string;
  from: string;
  to: string;
  /** serial numbers (comma separated) - what a dashboard figure is made of */
  ids: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  page: number;
}

export const DEFAULT_FILTERS: RequestFilters = {
  view: 'open',
  q: '',
  types: '',
  stage: '',
  statuses: '',
  units: '',
  handler: '',
  from: '',
  to: '',
  ids: '',
  sort: 'status_changed_at',
  dir: 'desc',
  page: 1,
};

export const SORTS: { value: string; label: string; sort: SortKey; dir: 'asc' | 'desc' }[] = [
  { value: 'status_changed_at|desc', label: 'עדכון אחרון', sort: 'status_changed_at', dir: 'desc' },
  { value: 'stage_age_hours|desc', label: 'הממתינות הכי הרבה זמן', sort: 'stage_age_hours', dir: 'desc' },
  { value: 'created_at|desc', label: 'נפתחו לאחרונה', sort: 'created_at', dir: 'desc' },
  { value: 'created_at|asc', label: 'נפתחו ראשונות', sort: 'created_at', dir: 'asc' },
  { value: 'serial_number|asc', label: 'מספר קריאה', sort: 'serial_number', dir: 'asc' },
];

const VIEWS: ViewId[] = ['open', 'mine', 'overdue', 'decide', 'all'];
const SORT_KEYS = SORTS.map((s) => s.sort);
const TEXT_KEYS = ['q', 'types', 'stage', 'statuses', 'units', 'handler', 'from', 'to', 'ids'] as const;

/** URL -> filters. Anything unknown or malformed falls back to the default, so a hand-edited link never breaks the screen. */
export function parseFilters(params: URLSearchParams): RequestFilters {
  const filters: RequestFilters = { ...DEFAULT_FILTERS };

  const view = params.get('view');
  if (view && (VIEWS as string[]).includes(view)) filters.view = view as ViewId;

  for (const key of TEXT_KEYS) filters[key] = (params.get(key) ?? '').trim();

  const sort = params.get('sort');
  if (sort && (SORT_KEYS as string[]).includes(sort)) filters.sort = sort as SortKey;
  if (params.get('dir') === 'asc' || params.get('dir') === 'desc') filters.dir = params.get('dir') as 'asc' | 'desc';

  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 1) filters.page = page;

  return filters;
}

/** filters -> URL, leaving out whatever is the default so links stay short. */
export function toSearchParams(filters: RequestFilters, keep?: URLSearchParams): URLSearchParams {
  // other query parameters (the open booking drawer) are not ours to touch
  const params = new URLSearchParams(keep?.toString() ?? '');
  for (const key of ['view', 'sort', 'dir', 'page', ...TEXT_KEYS]) params.delete(key);

  if (filters.view !== DEFAULT_FILTERS.view) params.set('view', filters.view);
  for (const key of TEXT_KEYS) if (filters[key]) params.set(key, filters[key]);
  if (filters.sort !== DEFAULT_FILTERS.sort || filters.dir !== DEFAULT_FILTERS.dir) {
    params.set('sort', filters.sort);
    params.set('dir', filters.dir);
  }
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** filters -> the API's query. */
export function toApiParams(filters: RequestFilters, perPage = 25): BookingListParams {
  return {
    q: filters.q,
    types: filters.types,
    stage: filters.stage,
    statuses: filters.statuses,
    units: filters.units,
    handler: filters.handler,
    from: filters.from,
    to: filters.to,
    ids: filters.ids,
    open_only: filters.view === 'open' || filters.view === 'mine' || filters.view === 'overdue',
    mine: filters.view === 'mine',
    overdue: filters.view === 'overdue',
    sync: filters.view === 'decide' ? 'conflict' : '',
    sort: filters.sort,
    dir: filters.dir,
    page: filters.page,
    per_page: perPage,
  };
}

/** How many of the "advanced" filters are on (for the button's badge). */
export function advancedCount(filters: RequestFilters): number {
  return (['types', 'stage', 'statuses', 'units', 'from', 'to', 'handler'] as const).filter((key) => filters[key]).length;
}
