/**
 * The booking types with a route of their own (the API's RouteRegistry, served to the management screens as
 * `catalog.routes`, keyed by the booking type id): today the clearance grant (מתן סיווג ביטחוני, 14). Such a type does
 * not follow the approver chain: its statuses are web only (101 and up), its steps are a progress bar, and several
 * roles work it - the קב"ט מחלקתי submits, the קצין ביטחון מידע owns it, the מתאם תחקיר schedules the interview.
 *
 * What is here is the fallback for screens that have no management catalog (the requester portal) and for a catalog
 * that does not list the route yet; when `catalog.routes` is at hand, it wins.
 */

/** The booking type ids with a route of their own (kept in sync with the API's RouteRegistry). */
export const ROUTE_TYPES = [14];

export const CLEARANCE_GRANT_TYPE_ID = 14;

/** Whether this booking type has a route of its own (statuses 101+, a progress bar, a handler). */
export const hasOwnRoute = (bookingTypeId) => ROUTE_TYPES.includes(Number(bookingTypeId));

/** A status of a route (web only): the mobile app never sees it. */
export const isRouteStatus = (statusId) => Number(statusId) >= 101;

/** The stages of the clearance grant, in route order (the ids `catalog.stages` and each row's `stage` use). */
export const ROUTE_STAGE_ORDER = ['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance'];

/** The two sections of a route form (`catalog.sections`): who fills the field. */
export const SECTION_LABELS = { requester: 'פרטים נוספים', handler: 'למילוי על ידי גורמים רלוונטיים' };

// The web-only role ids moved to 101+ on the API (role 7 is now the mobile's in-unit food control officer).
const ROLE = {
  infosec_officer: { id: 101, name: 'infosec_officer', label: 'קצין ביטחון מידע' },
  department_security_officer: { id: 103, name: 'department_security_officer', label: 'קב"ט מחלקתי' },
  interview_coordinator: { id: 104, name: 'interview_coordinator', label: 'מתאם תחקיר' },
};

/** The steps of the clearance grant: each step's status, its stage key (the status name) and its label. */
const CLEARANCE_STEPS = [
  { status_id: 101, key: 'interview_assignment', label: 'הקצאה לתחקיר' },
  { status_id: 102, key: 'interview_scheduled', label: 'נקבע מול המועמד' },
  { status_id: 103, key: 'interviewed', label: 'תוחקר' },
  { status_id: 104, key: 'awaiting_clearance', label: 'ממתין לקבלת הכשר' },
  { status_id: 105, key: 'clearance_granted', label: 'קיבל הכשר ביטחוני' },
];

const STEP_KEYS = Object.fromEntries(CLEARANCE_STEPS.map((step) => [step.status_id, step.key]));

/** `catalog.routes` as the API sends it, for a screen without the catalog. */
const FALLBACK_ROUTES = {
  14: {
    key: 'clearance_grant',
    initial_status_id: 101,
    success_status_id: 105,
    status_ids: [101, 102, 103, 104, 105, 4],
    steps: CLEARANCE_STEPS,
    requester_role: ROLE.department_security_officer,
    owner_role: ROLE.infosec_officer,
    roles: [ROLE.infosec_officer, ROLE.interview_coordinator],
    assignment: { statuses: [101, 102, 103, 104], assigners: ['infosec_officer'], candidates: ['interview_coordinator', 'infosec_officer'], self: ['interview_coordinator'] },
  },
};

/** The closed statuses of every type (the API's StatusBookingEnum::terminalIds). */
const TERMINAL_STATUS_IDS = [4, 5, 6, 7, 12, 13, 105];

/** The stage key of a step: the status name from the catalog, else the known one, else the status id. */
function stepKey(step, catalog) {
  if (step.key) return step.key;
  const status = (catalog?.statuses ?? []).find((candidate) => Number(candidate.id) === Number(step.status_id));
  return status?.name ?? STEP_KEYS[step.status_id] ?? String(step.status_id);
}

/**
 * The route of a booking type: the one the management catalog serves (`catalog.routes[id]`), else the known fallback;
 * null for a type without a route. Every step carries its stage `key`.
 */
export function routeOf(bookingTypeId, catalog) {
  const id = Number(bookingTypeId);
  const served = catalog?.routes?.[String(id)] ?? catalog?.routes?.[id] ?? null;
  const route = served ?? FALLBACK_ROUTES[id] ?? null;
  if (!route) return null;
  return { ...route, steps: (route.steps ?? []).map((step) => ({ ...step, key: stepKey(step, catalog) })) };
}

/** The steps of the type's progress bar ([] for a type without a route). */
export function routeSteps(bookingTypeId, catalog) {
  return routeOf(bookingTypeId, catalog)?.steps ?? [];
}

/**
 * The stage of a status on a route type (the API's TypeRoute::stageOf): each step but the last is a stage of its own
 * (named as the status), the successful end and the refusal are `closed`, and any other status (older data) counts as
 * the start of the route. Null for a type without a route.
 */
export function routeStageOf(statusId, bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return null;
  const id = Number(statusId);
  if (id === Number(route.success_status_id) || TERMINAL_STATUS_IDS.includes(id)) return 'closed';
  const step = route.steps.find((candidate) => Number(candidate.status_id) === id);
  return step?.key ?? route.steps[0]?.key ?? 'closed';
}

/** The label of a form section, from the catalog when it has one. */
export function sectionLabel(sectionId, catalog) {
  const served = (catalog?.sections ?? []).find((section) => section.id === sectionId);
  return served?.label ?? SECTION_LABELS[sectionId] ?? sectionId;
}

/** The roles that work a route type, as the settings card lists them: the requester, then the owner, then the other handlers. */
export function routeRoles(bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return [];
  const others = (route.roles ?? []).filter((role) => role.name !== route.owner_role?.name);
  return [route.requester_role, route.owner_role, ...others].filter(Boolean);
}
