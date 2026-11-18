# Service On Click - management console (`service-on-click-app`)

A Hebrew (RTL) Next.js app for the people who run Service On Click: **admins** (camp commander), **approvers** (domain commanders),
**vice approvers** (handlers) and the **super admin**. It only reads and decides on bookings - bookings are opened in the mobile app,
so there is no "new booking" screen.

The backend is the Laravel project **`service-on-click-api`** (the sibling repository). Its guide for this app is
[`docs/admin-api.md`](../service-on-click-api/docs/admin-api.md); the Postman collection is next to it. Everything the server decides
(who may do what, whose turn it is) comes back in the responses, so the UI is built from `me`, `capabilities` and each booking's
`actions` - roles are never hard-coded in `if`s.

- Stack: Next.js 16 (App Router, Turbopack) - React 19 - TypeScript (strict) - axios - TanStack Query - @dnd-kit - jsPDF.
- Design: the finished example UI in `project-files/srvonclick-internal` (vanilla JS) - same screens, wording and colour palette.
  `project-files/` is git-ignored reference material and is excluded from the build.
- Runs on a classified network: **nothing is loaded from the internet at runtime** (fonts are self-hosted, no CDN, no analytics).

## Quick start (local development)

Requirements: Node.js >= 20.9 (developed on 24), npm, and the API running with its MySQL database and MinIO bucket.

1. **API** (in `service-on-click-api`):
   ```bash
   php artisan run:all          # rebuilds the database (migrate:fresh --seed) and serves http://localhost:8000
   ```
   Then import the sample bookings once - open `http://localhost:8000/api/test-import` in a browser (token-free on a local machine).
   The two sample files (`SrvOnClick_b2r_export_bookings_*.json`, `SrvOnClick_b2r_application_logs_*.json`) must be in the MinIO bucket under
   `import-json/booking-data` and `import-json/application-log`. The importer **moves** a file to `loaded-json/` after reading it, so a second
   import finds nothing: copy the files back to re-import (see Troubleshooting).
2. **App** (this repo):
   ```bash
   npm install
   npm run dev                  # http://localhost:3000
   ```
3. Sign in at `/login` with a personal number (development only - production uses ADFS):

   | Personal number | Role | What it sees |
   |---|---|---|
   | `99804761` | super admin | everything, incl. form structure, organisation, history, sync |
   | `99810738`, `99815080`, `99802210`, `99801758` | admin (camp commander) | views and manages, never decides |
   | `99815386` | approver (domain commander) | the final decision, after the vice approver |
   | `99807387` | user | no access until you give them a role (People screen) |

   The seeders do not create a **vice approver**: sign in as an admin, open *ניהול > משתמשים והרשאות*, and give a user the "גורם מטפל"
   role on a booking type. A vice approver sees only the queue, and only bookings at their own stage.

## How it talks to the API

The browser only ever talks to the Next.js server. `next.config.ts` forwards `/api/*` to the Laravel API (`API_ORIGIN`, default
`http://localhost:8000`), so there is **one origin: no CORS**, and the API's `ServOnClickAccessToken` cookie (HttpOnly, SameSite=Lax) is set
and sent by the browser itself. The app never reads, stores or sends a token.

- A **401** anywhere sends the user to `/login` (keeping the page they were on). Accounts with no manager role get a clear "no access" screen.
- **409** = someone changed it first (stale `version`, or an open sync conflict): the screen reloads the record and the user retries.
- **422** = the server's Hebrew message is shown as is. **403 / 404 / 405** = one vague message (the API never says whether a record exists).
- Every decision sends the `version` that was on screen and an `Idempotency-Key` (one per user action), so a double click or a retry
  after a lost answer never acts twice.
- The API allows 100 requests a minute per user, so data is cached (React Query, 30 s) and nothing polls.

## Configuration

See [`.env.example`](.env.example). The defaults work for local development without any env file.

| Variable | Default | Meaning |
|---|---|---|
| `API_ORIGIN` | `http://localhost:8000` | where `/api/*` is forwarded, as an origin with no `/api` (a trailing `/api` is dropped). Read by `next dev` and **`next build`** (Next bakes rewrites at build time) |
| `NEXT_PUBLIC_DEV_LOGIN` | `true` | show the personal-number login form; set `false` on DEV and PROD (ADFS) |
| `NEXT_PUBLIC_ADFS_URL` | empty | the ADFS service. The login page loads `${NEXT_PUBLIC_ADFS_URL}/api/token` in a hidden frame, takes the token it posts and sends `{ "token": ... }` to the API's `/login`. Empty = ADFS off |
| `NEXT_PUBLIC_LOGIN_URL` | empty | where to send a user whose session ended when the form is off (e.g. the ADFS address) |

Three ways to run, chosen by these variables (all `NEXT_PUBLIC_*` and `API_ORIGIN` are fixed at build time, so each image is built for one):

| | `NEXT_PUBLIC_DEV_LOGIN` | `NEXT_PUBLIC_ADFS_URL` | `API_ORIGIN` | Set in |
|---|---|---|---|---|
| Local development | `true` (default) | empty | `http://localhost:8000` | no env file needed |
| DEV | `false` | the ADFS service | the DEV API origin | `Dockerfile_dev` |
| PROD | `false` | the ADFS service | the PROD API origin | `Dockerfile_prod` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | development server with Turbopack |
| `npm run build` / `npm start` | production build and server (set `API_ORIGIN` before building) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm test` | Vitest unit tests of the pure logic (value flattening, formatting, filters, export writers, ...) |

`.npmrc` mirrors the API repo (`ignore-scripts=true`, `audit=true`). `npm audit --omit=dev` is clean; dependency versions are pinned and were
chosen at least two weeks after their release.

## Project structure

```
src/
  app/                      routes (App Router). (app)/ = everything behind the login; login/ is public
  features/                 one folder per screen / area, each with its own components, hooks and tests
    bookings/               booking drawer, decision dialog, date/time correction, attachments + viewer, sync-conflict dialog
    queue/  requests/       "ממתין לטיפולי" and the filtered list (filters live in the URL)
    dashboard/  targets/    main screen tiles, domain dashboard, handling-target dialog
    settings/               domains overview + per-type settings (form structure with drag & drop, target, operations, blocked dates, options, statement)
    people/  org/           users and roles, units and departments
    reports/  audit/  sync/ report generator (+ Excel/PDF), history of changes, sync with the mobile app
    auth/                   login form
  components/
    ui/                     Button, Modal, Drawer, Chips, Controls (Seg, Tabs, Pager), Feedback (Notice, EmptyState, ...), Icon
    booking/                Ticket (list row), route visualisations, domain badge
    layout/                 top bar, global search, frame, Guard (capability check)
  lib/
    api/                    client.ts (axios + ApiError), endpoints.ts (every call, typed), types.ts (the contract), keys.ts (query keys)
    export/                 dependency-free .xlsx writer, PDF builder (jsPDF), download helper
    booking-values.ts       flattens the polymorphic `booking_values` tree for display
    labels.ts  format.ts    Hebrew wording / colours, dates and durations
    nav.ts                  who sees which menu item (from `capabilities`)
  providers/                React Query, session (`me` + `catalog`), toasts + confirm dialog
  styles/                   design tokens and the ported design system (RTL, logical properties)
public/
  icons/domains/            the external system's own domain icons
  fonts/                    Assistant TTF (used by the PDF export only; the UI font comes from @fontsource-variable/assistant)
```

### Adding a screen or a call

1. Add the call to `src/lib/api/endpoints.ts` and its response shape to `types.ts` (check it against a real response, not just the docs).
2. Put the screen in `src/features/<name>/` and a thin `page.tsx` in `src/app/(app)/...` wrapped in `<Guard capability="...">`.
3. Add the menu item in `src/lib/nav.ts`, conditioned on a **capability** the server returns - never on a role name.
4. Read data with `useQuery` (keys in `keys.ts`); after a write call `invalidateWork(queryClient)` or the specific keys.

## Roles and screens

The menu is computed from `GET /me` (`capabilities`, `is_*`, `permissions`); the server enforces every call.

| Screen | Who | Notes |
|---|---|---|
| Main screen | admin, super admin: domain tiles; approver: their domain dashboard | tiles open the dashboard, bars open the list |
| ממתין לטיפולי / הקריאות שלי לטיפול | anyone who acts on bookings | `mine=1`; a vice approver sees only bookings at their stage |
| קריאות | all managers | filters in the URL, decisions from each booking's `actions` |
| Booking drawer | all managers | values (date/time correctable where `editable`), history, comments, files and images, sync conflicts |
| דו"חות | `reports.view` | pick columns, filter, preview, Excel and PDF built in the browser |
| ניהול > תחומי שירות | managers of a type | settings, form structure (super admin edits), handling target, blocked dates with impact confirmation |
| ניהול > משתמשים והרשאות | `users.manage` | roles per booking type, departments |
| ניהול > יחידות ומחלקות | `config.global` (super admin) | a unit's letter never changes |
| היסטוריית שינויים | `audit.view` (super admin) | append-only log; a red banner when the hash chain does not verify |
| סנכרון עם האפליקציה | `sync.view` (super admin) | files sent to the mobile app, blocked/failed, conflicts and their resolution |

### Types with a route of their own (מתן סיווג ביטחוני, type 14)

The clearance grant does not follow the approver chain: the API serves its route in `catalog.routes` (steps, roles, assignment
rules), and `src/lib/routeTypes.js` holds the same knowledge as a fallback for screens without the catalog (the requester portal).
Its guide is `../service-on-click-api/docs/frontend-clearance-grant-refactoring-guide.md`.

- **קב"ט מחלקתי** (`department_security_officer_14`) submits it on the requester portal: the form is laid out on a 4-column grid
  (`col_span`), the ID-number field looks the person up (`GET /requester/person-lookup`) and fills the fields with an `autofill_key`.
- **קצין ביטחון מידע** (`infosec_officer_14`) owns it: assigns the handler, moves it back, refuses, closes; reads its settings
  (ניהול > תחומי שירות is open to a route owner, read-only).
- **מתאם תחקיר** (`interview_coordinator_14`) takes it, fills the handler section (place, date, time of the interview) and moves it on.
- The drawer shows the server's `progress[]` as the route, the handler block, the handler section (`handler_fields`) and the
  `actions[]` exactly as served (`enabled` / `disabled_reason`, `required_fields` asked for in the dialog, `clears_fields` warned about).
  A request waiting for its interview moment (`stage_due_at`) is re-read every minute: the scheduler moves it on by itself.

## Security notes

- Session = the API's HttpOnly cookie; no token is ever available to JavaScript. Logout calls `POST /api/logout` and drops all cached data.
- `?next=` after login only accepts same-site paths (no open redirect). Security headers are set in `next.config.ts`.
- All text from the API is rendered as text (React escapes it); attachments are loaded with the login cookie from `/api/...` only.
- The personal-number login form is for development; turn it off in production.

## Troubleshooting

- **The list is empty / "no bookings"**: the API database is empty. Import the sample files (see Quick start). The importer moves files to
  `loaded-json/`; copy `loaded-json/SrvOnClick_b2r_*_<date>.json` back to `import-json/booking-data/` and `import-json/application-log/`, then call
  `/api/test-import` again.
- **`429`** ("בקשות מרובות לשרת"): the API's rate limit (100 requests a minute per user). Wait a minute.
- **Everything redirects to `/login`**: the API is not running on `API_ORIGIN`, or the session ended.
- **`Module not found: Can't resolve '@/...'`**: a `tsconfig.json` saved with a UTF-8 BOM (Windows PowerShell `Set-Content` adds one). Re-save it without BOM.
- **Changed `API_ORIGIN` but requests still go to the old address**: restart `next dev` / rebuild; rewrites are fixed when Next starts or builds.
