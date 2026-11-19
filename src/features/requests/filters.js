






export const DEFAULT_FILTERS = {
  view: 'open',
  q: '',
  types: '',
  stage: '',
  statuses: '',
  units: '',
  handler: '',
  // route types (lib/routeTypes): the assigned handler - `me`, `none`, or a handler's uuid (the API's assigned_to)
  assigned: '',
  from: '',
  to: '',
  ids: '',
  sort: 'status_changed_at',
  dir: 'desc',
  page: 1,
};

export const SORTS = [
  { value: 'status_changed_at|desc', label: 'עדכון אחרון', sort: 'status_changed_at', dir: 'desc' },
  { value: 'stage_age_hours|desc', label: 'הממתינות הכי הרבה זמן', sort: 'stage_age_hours', dir: 'desc' },
  { value: 'created_at|desc', label: 'נפתחו לאחרונה', sort: 'created_at', dir: 'desc' },
  { value: 'created_at|asc', label: 'נפתחו ראשונות', sort: 'created_at', dir: 'asc' },
  { value: 'serial_number|asc', label: 'מספר קריאה', sort: 'serial_number', dir: 'asc' },
  // the interview moment of a route type's request (offered only to those who act on such a type)
  { value: 'stage_due_at|asc', label: 'מועד התחקיר', sort: 'stage_due_at', dir: 'asc', routeOnly: true },
];

const VIEWS = ['open', 'mine', 'overdue', 'decide', 'all'];
const SORT_KEYS = SORTS.map((s) => s.sort);
const TEXT_KEYS = ['q', 'types', 'stage', 'statuses', 'units', 'handler', 'assigned', 'from', 'to', 'ids'];

/** URL -> filters; unknown or malformed values fall back to the default. */
export function parseFilters(params) {
  const filters = { ...DEFAULT_FILTERS };

  const view = params.get('view');
  if (view && (VIEWS).includes(view)) filters.view = view;

  for (const key of TEXT_KEYS) filters[key] = (params.get(key) ?? '').trim();

  const sort = params.get('sort');
  if (sort && (SORT_KEYS).includes(sort)) filters.sort = sort;
  if (params.get('dir') === 'asc' || params.get('dir') === 'desc') filters.dir = params.get('dir');

  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 1) filters.page = page;

  return filters;
}

/** filters -> URL, omitting defaults to keep links short. */
export function toSearchParams(filters, keep) {
  // Keep other query params (e.g. the open drawer).
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
export function toApiParams(filters, perPage = 25) {
  return {
    q: filters.q,
    types: filters.types,
    stage: filters.stage === 'topic_handler' ? 'vice_approver,approver' : filters.stage,
    statuses: filters.statuses,
    units: filters.units,
    handler: filters.handler,
    assigned_to: filters.assigned,
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

/** Count of active advanced filters (button badge). */
export function advancedCount(filters) {
  return (['types', 'stage', 'statuses', 'units', 'from', 'to', 'handler', 'assigned']).filter((key) => filters[key]).length;
}

/** Preserve old queue deep links, including filters, sorting and an open booking. */
export function legacyQueueTarget(search = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) value.forEach((part) => params.append(key, part));
    else if (value != null) params.set(key, value);
  }
  params.set('view', 'mine');
  if (!params.has('sort')) params.set('sort', 'stage_age_hours');
  if (!params.has('dir')) params.set('dir', 'desc');
  return '/requests?' + params.toString();
}
