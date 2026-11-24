/**
 * The booking types with a route of their own (the API's RouteRegistry, served to the management screens as
 * `catalog.routes`, keyed by the booking type id): the clearance grant (מתן סיווג ביטחוני, 14) and the six תקשוב types
 * (20-25), which run on the service desk route (מוקד תקשוב). Such a type does not follow the approver chain: its steps
 * are a progress bar and its own roles work it - on the clearance grant the קב"ט מחלקתי submits, the קצין ביטחון מידע
 * owns it and the מתאם תחקיר schedules the interview; at the service desk every user submits, the נציג מוקד (the type's
 * vice approver) takes the request and closes it, and the מפקד תקשוב owns it (dashboard, the desk's people, settings).
 *
 * What is here is the fallback for screens that have no management catalog (the requester portal) and for a catalog
 * that does not list a route yet; when `catalog.routes` is at hand, it wins. What the catalog does not say - the stage of
 * each status (the API's TypeRoute::stageOf), whether the form has a section the handlers fill, and the words a route
 * uses for its roles and the shared statuses - is kept here by the route's `key`.
 */

export const CLEARANCE_GRANT_TYPE_ID = 14;

/** The six תקשוב types that run on the service desk route (the API's IctServiceDeskRoute). */
export const ICT_ROUTE_TYPES = [20, 21, 22, 23, 24, 25];

/** The booking type ids with a route of their own (kept in sync with the API's RouteRegistry). */
export const ROUTE_TYPES = [CLEARANCE_GRANT_TYPE_ID, ...ICT_ROUTE_TYPES];

/** Whether this booking type has a route of its own: what the catalog says when it lists the type, else the known types. */
export function hasOwnRoute(bookingTypeId, catalog) {
  const id = Number(bookingTypeId);
  if (catalog?.routes && (catalog.routes[String(id)] ?? catalog.routes[id])) return true;
  return ROUTE_TYPES.includes(id);
}

/** A status of a route (web only): the mobile app never sees it. */
export const isRouteStatus = (statusId) => Number(statusId) >= 101;

/** The clearance grant's stages, in route order (the ids `catalog.stages` and each row's `stage` use). */
export const CLEARANCE_STAGE_ORDER = ['interview_assignment', 'interview_scheduled', 'interviewed', 'awaiting_clearance'];

/** The service desk's stages: waiting in the desk's queue, then in a representative's hands. */
export const SERVICE_DESK_STAGE_ORDER = ['service_desk_queue', 'service_desk_handling'];

/** Every stage of every route, in reading order: the clearance grant's steps, then the service desk's. */
export const ROUTE_STAGE_ORDER = [...CLEARANCE_STAGE_ORDER, ...SERVICE_DESK_STAGE_ORDER];

/** The two sections of a route form (`catalog.sections`): who fills the field. */
export const SECTION_LABELS = { requester: 'פרטים נוספים', handler: 'למילוי על ידי גורמים רלוונטיים' };

// The roles as the API names them (RoleEnum): the web-only ones sit at 101+ (ביטחון מידע) and 151+ (תקשוב).
const ROLE = {
  user: { id: 5, name: 'user', label: 'משתמש' },
  vice_approver: { id: 4, name: 'vice_approver', label: 'גורם מטפל' },
  infosec_officer: { id: 101, name: 'infosec_officer', label: 'קצין ביטחון מידע' },
  department_security_officer: { id: 103, name: 'department_security_officer', label: 'קב"ט מחלקתי' },
  interview_coordinator: { id: 104, name: 'interview_coordinator', label: 'מתאם תחקיר' },
  admin_ict: { id: 152, name: 'admin_ict', label: 'מפקד תקשוב' },
};

/** The steps of the clearance grant: each step's status and its label. */
const CLEARANCE_STEPS = [
  { status_id: 101, label: 'הקצאה לתחקיר' },
  { status_id: 102, label: 'נקבע מול המועמד' },
  { status_id: 103, label: 'תוחקר' },
  { status_id: 104, label: 'ממתין לקבלת הכשר' },
  { status_id: 105, label: 'קיבל הכשר ביטחוני' },
];

/** The steps of the service desk: sent (the queue), taken by a representative, closed as done. */
const SERVICE_DESK_STEPS = [
  { status_id: 1, label: 'הקריאה נשלחה' },
  { status_id: 151, label: 'בטיפול המוקד' },
  { status_id: 5, label: 'סיום טיפול' },
];

/** The status names of the known steps (`statuses.name` on the API), for a catalog that does not list them. */
const STEP_KEYS = { 1: 'received', 5: 'completed', 101: 'interview_assignment', 102: 'interview_scheduled', 103: 'interviewed', 104: 'awaiting_clearance', 105: 'clearance_granted', 151: 'in_service_desk' };

/**
 * What each route knows beyond what the catalog serves, by the route's key:
 * - `stages`: its open stages in order; `stageOf`: the stage of each open status (any other open status - older data - is
 *   the first stage, and a closed status is `closed`), as the API's TypeRoute::stageOf answers;
 * - `handlerStages`: the stages where the route's handlers (not its owner, not the system) have the turn;
 * - `handlerSection`: whether its form has a section the handlers fill during the route;
 * - `roleLabels`: the words the route uses for a shared role; `statusLabels`: its own names for the shared statuses.
 */
const ROUTE_KNOWLEDGE = {
  clearance_grant: {
    stages: CLEARANCE_STAGE_ORDER,
    stageOf: { 101: 'interview_assignment', 102: 'interview_scheduled', 103: 'interviewed', 104: 'awaiting_clearance' },
    handlerStages: ['interview_assignment', 'interviewed'],
    handlerSection: true,
    roleLabels: {},
    statusLabels: { 4: 'נדחתה ע"י קצין ביטחון מידע' },
  },
  ict_service_desk: {
    stages: SERVICE_DESK_STAGE_ORDER,
    stageOf: { 1: 'service_desk_queue', 151: 'service_desk_handling' },
    handlerStages: SERVICE_DESK_STAGE_ORDER,
    handlerSection: false,
    roleLabels: { vice_approver: 'נציג מוקד' },
    statusLabels: { 1: 'הקריאה נשלחה', 5: 'סיום טיפול', 6: 'בוטלה ע"י המבקש', 7: 'נסגרה ללא ביצוע' },
  },
};

/** The service desk route as the API sends it, shared by the six תקשוב types. */
const SERVICE_DESK_ROUTE = {
  key: 'ict_service_desk',
  initial_status_id: 1,
  success_status_id: 5,
  status_ids: [1, 151, 5, 7, 6],
  steps: SERVICE_DESK_STEPS,
  requester_role: ROLE.user,
  owner_role: ROLE.admin_ict,
  roles: [ROLE.vice_approver, ROLE.admin_ict],
  assignment: { statuses: [1, 151], assigners: ['admin_ict'], candidates: ['vice_approver', 'admin_ict'], self: ['vice_approver'] },
};

/** `catalog.routes` as the API sends it, for a screen without the catalog. */
const FALLBACK_ROUTES = {
  [CLEARANCE_GRANT_TYPE_ID]: {
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
  ...Object.fromEntries(ICT_ROUTE_TYPES.map((id) => [id, SERVICE_DESK_ROUTE])),
};

/** The closed statuses of every type (the API's StatusBookingEnum::terminalIds). */
const TERMINAL_STATUS_IDS = [4, 5, 6, 7, 12, 13, 105];

/** The stage key of a step: the status name from the catalog, else the known one, else the status id. */
function stepKey(step, catalog) {
  if (step.key) return step.key;
  const status = (catalog?.statuses ?? []).find((candidate) => Number(candidate.id) === Number(step.status_id));
  return status?.name ?? STEP_KEYS[step.status_id] ?? String(step.status_id);
}

/** The stage of a status on a route (see ROUTE_KNOWLEDGE); a route this file does not know names each step as its status. */
function stageOfStatus(statusId, route, catalog) {
  const id = Number(statusId);
  if (id === Number(route.success_status_id) || TERMINAL_STATUS_IDS.includes(id)) return 'closed';
  const known = ROUTE_KNOWLEDGE[route.key];
  if (known) return known.stageOf[id] ?? known.stages[0];
  const steps = route.steps ?? [];
  const step = steps.find((candidate) => Number(candidate.status_id) === id) ?? steps[0];
  return step ? stepKey(step, catalog) : 'closed';
}

/** A role row with the words the route uses for it (the desk's vice approver is its נציג מוקד); the API's label otherwise. */
function routeRole(role, known) {
  if (!role) return role;
  const label = known?.roleLabels?.[role.name] ?? role.label;
  return label === undefined ? role : { ...role, label: String(label).trim() };
}

/**
 * The route of a booking type: the one the management catalog serves (`catalog.routes[id]`), else the known fallback;
 * null for a type without a route. Every step carries its stage `key` (the status name) and the `stage` it stands for;
 * every role carries the label the route uses for it.
 */
export function routeOf(bookingTypeId, catalog) {
  const id = Number(bookingTypeId);
  const served = catalog?.routes?.[String(id)] ?? catalog?.routes?.[id] ?? null;
  const route = served ?? FALLBACK_ROUTES[id] ?? null;
  if (!route) return null;
  const known = ROUTE_KNOWLEDGE[route.key] ?? null;
  return {
    ...route,
    steps: (route.steps ?? []).map((step) => ({ ...step, key: stepKey(step, catalog), stage: stageOfStatus(step.status_id, route, catalog) })),
    requester_role: routeRole(route.requester_role, known),
    owner_role: routeRole(route.owner_role, known),
    roles: (route.roles ?? []).map((role) => routeRole(role, known)),
  };
}

/** The steps of the type's progress bar ([] for a type without a route). */
export function routeSteps(bookingTypeId, catalog) {
  return routeOf(bookingTypeId, catalog)?.steps ?? [];
}

/**
 * The stage of a status on a route type (the API's TypeRoute::stageOf): each step but the last is a stage of its own,
 * the successful end and the refusals are `closed`, and any other status (older data) counts as the start of the route.
 * Null for a type without a route.
 */
export function routeStageOf(statusId, bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  return route ? stageOfStatus(statusId, route, catalog) : null;
}

/** The open stages of the type's route, in order ([] for a type without a route). */
export function routeStages(bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return [];
  const known = ROUTE_KNOWLEDGE[route.key];
  return known ? [...known.stages] : route.steps.slice(0, -1).map((step) => step.stage);
}

/** The stages of the type's route where its handlers have the turn (the coordinator's, the representative's); [] without a route. */
export function routeHandlerStages(bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return [];
  return [...(ROUTE_KNOWLEDGE[route.key]?.handlerStages ?? routeStages(bookingTypeId, catalog))];
}

/** Whether the type's form has a section the handlers fill during the route (the clearance grant has one; the desk's forms have none). */
export function hasHandlerSection(bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return false;
  return ROUTE_KNOWLEDGE[route.key]?.handlerSection ?? true;
}

/** A role as the type's route names it ("נציג מוקד" for the desk's vice approver), or null when the type has no route or no such role. */
export function routeRoleLabel(roleName, bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  if (!route) return null;
  return [route.requester_role, route.owner_role, ...(route.roles ?? [])].find((role) => role?.name === roleName)?.label ?? null;
}

/** A shared status as the type's route names it (the desk: "הקריאה נשלחה" for 1, "נסגרה ללא ביצוע" for 7), or null. */
export function routeStatusLabel(statusId, bookingTypeId, catalog) {
  const route = routeOf(bookingTypeId, catalog);
  return route ? ROUTE_KNOWLEDGE[route.key]?.statusLabels?.[Number(statusId)] ?? null : null;
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
