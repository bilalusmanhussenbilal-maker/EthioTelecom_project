# Network Service Survey

A field-survey platform for fixed and Wi-Fi network technicians. Technicians identify the box,
port and line serving a service, verify technical feasibility on site, and hand a clean result to
a supervisor for approval.

Core workflow: **Service -> Old Network -> Change/Shift -> New Network -> Survey -> Verification -> Completion**

## Stack

| Workspace | Technology |
| --- | --- |
| `client` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| `server` | Node.js, Express 5, TypeScript, Zod, Pino |

The repository is an npm-workspaces monorepo: one install, one lockfile, two apps.

## Structure

```
internship-project/
├── client/                 # Next.js frontend
│   ├── app/                # App Router routes, layout, globals.css (design tokens)
│   │   ├── (app)/          # signed-in area: dashboard, surveys, search, technicians, reports, admin
│   │   └── login/          # sign-in route
│   ├── components/         # theme provider, shared UI primitives, feature components
│   ├── lib/                # utils, domain labels, hooks, auth context, typed API modules
│   └── package.json
├── server/                 # Express backend
│   ├── prisma/             # schema, migrations and seed
│   ├── src/
│   │   ├── config/         # validated environment configuration
│   │   ├── controllers/    # request/response translation
│   │   ├── services/       # business logic
│   │   ├── routes/         # route definitions
│   │   ├── models/         # data layer
│   │   ├── middleware/     # logging, error handling
│   │   ├── utils/          # logger, ApiError
│   │   ├── app.ts          # express app wiring
│   │   └── server.ts       # http entrypoint
│   └── package.json
├── package.json            # workspaces + root scripts
├── .env.example
└── AGENTS.md
```

## Prerequisites

- Node.js 20 or newer (developed against Node 24)
- npm 10 or newer

## Getting started

```bash
npm install
```

Create the local environment files:

```bash
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

The root `.env.example` documents every variable for both workspaces in one place.

Run both apps together:

```bash
npm run dev
```

- Client: http://localhost:3000
- API: http://localhost:4000/api/v1

## Root scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the client and server together |
| `npm run dev:client` | Run only the Next.js client |
| `npm run dev:server` | Run only the Express server |
| `npm run build` | Production build of both workspaces |
| `npm run typecheck` | TypeScript check for both workspaces |
| `npm run lint` | ESLint for both workspaces |
| `npm run clean` | Remove build output |

## API

Base URL: `http://localhost:4000/api/v1`.

Every endpoint except `GET /health` and `POST /auth/login` requires the httpOnly session cookie
issued at login. Authorisation is enforced in the backend middleware and again in the services;
a hidden button is never treated as a security boundary.

### Authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Liveness probe |
| `POST` | `/auth/login` | public | Sign in, sets the session cookie |
| `POST` | `/auth/logout` | public | Clear the session cookie and revoke the token |
| `GET` | `/auth/me` | any role | Current user together with the technician profile |

Sessions are revocable. Each account carries a `tokenVersion` that is embedded in its JWT as the
`ver` claim and compared against the database on every authenticated request, so logging out or
resetting a password invalidates every token that account already holds instead of leaving a copied
token usable until it expires. Revocation is per account rather than per device: signing out on one
phone also ends that account's other sessions. A request without a usable token still gets its cookie
cleared, and a database problem during revocation is logged rather than failing the logout.

### Reference data

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/network/options` | any role | Survey-form payload: areas, boxes with their ports, lines with remaining capacity |
| `GET` | `/network/areas` | any role | Service areas with hierarchy and counts |
| `GET` | `/network/areas/:id` | any role | One area with parent, children and counts |
| `GET` | `/network/boxes?areaId&status` | any role | Boxes with ports |
| `GET` | `/network/boxes/:id` | any role | One box with ports, line hops and a port summary |
| `GET` | `/network/boxes/code/:code` | any role | Lookup by box number |
| `GET` | `/network/boxes/:id/ports` | any role | Ports in a box, optionally filtered by status |
| `GET` | `/network/boxes/:id/available-ports` | any role | Only assignable ports, so occupied ports cannot be picked |
| `GET` | `/network/lines?areaId` | any role | Lines with route and remaining capacity |
| `GET` | `/network/lines/:id` | any role | One line with its hop-by-hop route |
| `GET` | `/network/services?areaId&status` | any role | Services with old and new network |
| `GET` | `/network/services/:id` | any role | One service with old network, new network and survey history |
| `GET` | `/network/services/code/:code` | any role | Lookup by service ID |

### Network administration (administrator only)

Administrators manage the master data the survey workflow reads (AGENTS.md #2 and #20). Every
mutation is role-gated in the middleware and again in the service, and every change writes an
activity-log entry.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/network/areas` | admin | Create a service area |
| `PATCH` | `/network/areas/:id` | admin | Rename or re-parent an area |
| `DELETE` | `/network/areas/:id` | admin | Delete an area nothing references |
| `POST` | `/network/boxes` | admin | Create a box |
| `PATCH` | `/network/boxes/:id` | admin | Edit a box |
| `DELETE` | `/network/boxes/:id` | admin | Delete a box that has no ports and no network references |
| `POST` | `/network/boxes/:id/ports` | admin | Add a port to a box |
| `PATCH` | `/network/ports/:id` | admin | Change a port status or note |
| `DELETE` | `/network/ports/:id` | admin | Delete a port no service uses |
| `POST` | `/network/lines` | admin | Create a line and its route hops |
| `PATCH` | `/network/lines/:id` | admin | Edit a line, replacing the route when `hops` is sent |
| `DELETE` | `/network/lines/:id` | admin | Delete a line no service uses |
| `POST` | `/network/services` | admin | Create a service with its old and new network |
| `PATCH` | `/network/services/:id` | admin | Edit a service; sending `null` clears a network link |
| `DELETE` | `/network/services/:id` | admin | Delete a service that has no surveys |

Guards refuse to delete data a survey or service still depends on and return `409`
(`AREA_IN_USE`, `BOX_IN_USE`, `PORT_IN_USE`, `LINE_IN_USE`, `SERVICE_IN_USE`); bad input returns
`422` (`UNKNOWN_AREA`, `UNKNOWN_BOX`, `UNKNOWN_PORT`, `UNKNOWN_LINE`, `PORT_BOX_MISMATCH`,
`CAPACITY_EXCEEDED`, `AREA_CYCLE`) and duplicate codes return `409`. A route hop whose `nodeCode`
matches a box code is linked to that box automatically, so `MSAN-03 -> BOX-15 -> BOX-18 -> BOX-22`
is stored as a real hop-by-hop route.

### Search

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/search?q=&limit=` | any role | Match service ID, customer name, address, area, box number, port number or line number in one call |
| `GET` | `/search/services/:serviceCode/network-path` | any role | The single "minimal navigation" view: service, old network, new network, change request and every survey raised against it |

`/search` returns grouped `services`, `boxes`, `ports` and `lines`, and each box, port or line also
carries the services that reference it, so one search result is enough to reach the network path.

### Surveys

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/surveys?status&technicianId&serviceId&areaId&serviceCode&search&page&pageSize` | any role | Role-scoped queue; a technician only ever sees their own |
| `POST` | `/surveys` | supervisor, admin | Create a survey, optionally assigning and retargeting the new network in the same call |
| `GET` | `/surveys/:id` | any role | Survey detail with a live feasibility preview |
| `GET` | `/surveys/:id/form-data` | any role | Auto-populated form: service, old network, new network, field observations, GPS, feasibility, available ports, candidate lines |
| `GET` | `/surveys/:id/timeline` | any role | Activity trail for the survey |
| `POST` | `/surveys/:id/assign` | supervisor, admin | Assign or reassign a technician, closing the previous assignment |
| `PATCH` | `/surveys/:id/field-data` | technician | Save field observations and move `NEW`/`RETURNED` to `IN_PROGRESS` |
| `POST` | `/surveys/:id/submit` | technician | Submit with mandatory GPS; runs the feasibility engine and freezes the result |
| `POST` | `/surveys/:id/review` | supervisor, admin | `APPROVE`, `REJECT` or `RETURN` with a remark |

Submitting is deliberately strict, and every rule is enforced server side:

- GPS latitude, longitude and accuracy are required, and accuracy must beat `GPS_MAX_ACCURACY_METERS`.
- When the service has coordinates, the distance from the captured position is stored, along with
  whether it falls inside `GPS_SERVICE_RADIUS_METERS`.
- Box and port condition must be recorded when the survey targets a box or port.
- A survey that comes back `NOT_FEASIBLE` cannot be submitted without a technician remark saying why.
- The feasibility engine from AGENTS.md #10 re-runs on submit; the stored `feasibilityStatus` and
  reason codes are the backend's answer, not the client's.

### Offline synchronisation (technician only)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/sync/pull` | Everything the signed-in technician needs to keep working without a connection: their assigned surveys, the matching form data and the network options |
| `POST` | `/sync/push` | Apply one locally recorded `SAVE` or `SUBMIT` mutation |

Field work survives a lost connection. `GET /sync/pull` returns one snapshot (assigned surveys,
their form data, network options) that the client stores in IndexedDB, and `surveys.version` is the
concurrency token carried back on every write. A push whose `baseVersion` no longer matches returns
`409 SYNC_CONFLICT` with the current version, so the technician is told the survey moved on instead
of silently overwriting someone else's edit. `mutationId` makes retries idempotent: the first
successful run stores its response in `sync_receipts` and a retry with the same payload replays that
response rather than writing twice, while a retry that reuses an id with different data is refused as
`SYNC_MUTATION_REUSED`. Only technicians can sync, and only for surveys assigned to them.

### Technicians

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/technicians/me/dashboard` | technician | Own counts by status, recent surveys and next due date |
| `GET` | `/technicians` | supervisor, admin | Every technician with a survey workload breakdown |
| `GET` | `/technicians/:id` | supervisor, admin | Technician profile |
| `GET` | `/technicians/:id/dashboard` | supervisor, admin | Per-technician dashboard |
| `PATCH` | `/technicians/:id/availability` | supervisor, admin | Mark a technician available or unavailable |

### Users (administrator only)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/users?role&isActive&search&page&pageSize` | Paginated accounts with technician profiles |
| `POST` | `/users` | Create an account; the technician profile is created in the same transaction |
| `GET` | `/users/:id` | Account detail with recent activity |
| `PATCH` | `/users/:id` | Update name, phone, zone or availability |
| `PATCH` | `/users/:id/active` | Activate or deactivate; self-deactivation is refused |
| `PATCH` | `/users/:id/password` | Reset a password |

### Reports (supervisor and administrator)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/reports?from&to&areaId` | All six report tables in one response |
| `GET` | `/reports/:key` | A single report |
| `GET` | `/reports/:key/export?format=csv` | Download a report as CSV |

Report keys: `survey-summary`, `port-availability`, `box-utilization`, `line-capacity`,
`technician-performance`, `services-by-area`. Every report returns the same shape
(`columns` + `rows`), so one table component and one chart component can render all of them.

### Activity log (administrator only)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/activity-logs?userId&surveyId&action&search&from&to&page&pageSize` | Audit trail, e.g. "Technician 014 submitted survey" |

### System configuration (administrator only)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/settings` | Effective values, the overrides an administrator saved, and the field metadata the admin form renders from |
| `PATCH` | `/settings` | Update one or more settings; only the keys present in the body change |

`server/src/config/settings.ts` declares every setting once - key, label, bounds, unit and default -
and both the API and the admin screen read that table, so a new setting reaches the form without a
front-end change. Defaults come from the environment (`GPS_MAX_ACCURACY_METERS`,
`GPS_SERVICE_RADIUS_METERS`); the database only holds what an administrator actually changed, so an
out-of-range row, or one written by a newer build, is ignored in favour of the deployment default
instead of breaking the field app. Reads are cached in memory for 30 seconds and the cache is
refreshed on write. Every change is written to the activity log as `SETTINGS_UPDATED`.

The technician-facing subset travels with the survey form data as `policy`, so the form enforces
exactly the thresholds the server will apply, and a cached offline snapshot keeps working without a
second request.

Errors use a single envelope so the client can render them uniformly:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No route matches GET /api/v1/nope"
  }
}
```

Validation failures return `422` with `error.code = "VALIDATION_ERROR"` and a `details` array of
`{ path, message }` entries. Domain refusals use their own codes, for example `GPS_ACCURACY_TOO_LOW`,
`REMARK_REQUIRED`, `USERNAME_TAKEN` or `SELF_DEACTIVATION`.

## Database

PostgreSQL hosted on Neon, accessed through Prisma. Prisma is a library - the database itself is
remote, and `DATABASE_URL` in `server/.env` is the only thing that points at it.

```bash
cd server
npx prisma migrate status   # check the schema is applied
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # reload the demo data
npx prisma studio           # browse the data
```

Useful connection-string parameters for a hosted pooler, already applied to `DATABASE_URL`:

- `sslmode=require` and `channel_binding=require` - Neon refuses non-channel-bound connections.
- `connect_timeout=15` - the free tier suspends when idle, so the first connect is slow.
- `pool_timeout=30` - the pooled endpoint is slower to hand out a connection than a local server.

### Demo accounts

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `Admin@12345` | Administrator |
| `supervisor` | `Super@12345` | Supervisor |
| `tech014` | `Tech@12345` | Field technician |
| `tech015` | `Tech@12345` | Field technician |

Seed data follows AGENTS.md deliberately: `BOX-22` has ports 01, 02 and 04 occupied with 03 and 05
available; `LINE-05` runs `MSAN-03 -> BOX-15 -> BOX-18 -> BOX-22` with 18 of 48 capacity free;
`SRV-002` is the not-feasible case, because `BOX-30` has no free port and `LINE-09` is full.
## Frontend

### Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | public | Landing page and sign-in entry point. |
| `/login` | public | Credential sign-in, with one-click demo accounts. |
| `/dashboard` | all roles | Role-specific dashboard. |
| `/search` | all roles | #16 search across services, boxes, ports and lines. |
| `/surveys` | all roles | Technician "My surveys" queue, or the supervisor/admin survey queue. |
| `/surveys/[id]` | all roles | Survey detail: old network, new network, field survey, feasibility, timeline. |
| `/surveys/[id]/survey` | technician | The #9 survey form, GPS capture and submission. |
| `/technicians` | supervisor, admin | Technician workload and availability. |
| `/reports` | supervisor, admin | #17 reports with charts, tables and CSV export. |
| `/admin/users` | admin | Account creation, roles and password resets. |
| `/admin/network` | admin | #2 administrator master data: service areas, boxes with inline port management, lines with an ordered route editor, and services with old/new network pickers. |
| `/admin/settings` | admin | #2 runtime configuration: GPS thresholds and the activity-log window. |
| `/admin/activity` | admin | #20 system-wide audit trail, with an action filter and free-text search. |

### How it is put together

- The session is an httpOnly cookie on the API origin, so the signed-in area is client rendered and
  `client/app/(app)/layout.tsx` gates it on `useAuth()`. Server Components are still used for the
  public shell and the landing page.
- `client/lib/api/` holds one module per backend resource on top of the shared `client.ts` fetch
  wrapper; UI components never call `fetch` directly.
- `client/lib/hooks/use-async.ts` covers the loading / ready / error states every API-backed view
  needs, including the 401 wording so an expired session does not look like a broken connection.
- A 401 is a session problem rather than a failed request, so it is handled once instead of per
  view: `client/lib/api/session.ts` announces it, the auth provider ends the session, and the
  signed-in layout returns the user to `/login` with a short explanation instead of leaving a
  retry button that can never succeed.
- `client/components/app/` holds the cross-feature pieces (shell, alerts, async boundary, page
  header, stat cards, status badges) and `client/components/<feature>/` holds the feature views.
- `client/lib/domain.ts` is the single source of truth for every enum label and colour tone, so
  status wording stays consistent across dashboards, tables and forms.
- `client/app/globals.css` holds the design tokens and the `@theme inline` mapping that exposes
  them as Tailwind utilities. Dark mode is class based (`.dark` on `<html>`) and is applied before
  first paint by an inline script in the root layout.
- Layout is mobile first, because technicians use phones in the field.
- `client/public/sw.js` is a hand-written app-shell service worker, registered only by a production
  build (`client/components/app/service-worker-registrar.tsx`). It precaches `/offline.html`, serves
  `/_next/static/*` cache-first and answers navigations network-first, falling back to a previously
  visited page and then to the offline page. It deliberately ignores the API: survey data, the
  offline queue and conflict handling already live in IndexedDB under the app's control, and a second
  cached copy of an API response would be a second, silently stale source of truth. In development
  the registrar instead unregisters any worker and clears its caches, because the dev server rewrites
  chunks on every edit.
- `client/lib/offline/` is the field app's offline layer: `storage.ts` holds the IndexedDB snapshot
  and the queue of locally recorded mutations, `sync-manager.ts` owns the online state, the retry and
  the conflict, and `sync-provider.tsx` exposes all of it through `useSync()`. Nothing queued is
  dropped silently - a failed write surfaces as a storage error instead - and
  `client/components/app/sync-status-indicator.tsx` is the one place that turns the state into the
  indicators the field app has to make obvious: offline, pending, syncing, synced and failed.

### Survey form behaviour

The form loads `GET /surveys/:id/form-data` plus `GET /network/options`, so service, old network
and new network are already filled in. The technician only sets the field observations, the target
box/port/line and the remark. The feasibility badge re-checks on save, and the boxes and ports the
API offers are already filtered to assignable ones. **GPS is required to submit** - the submit
button is blocked until a fix is captured, and the API rejects a submission without one. A fix
worse than `GPS_MAX_ACCURACY_METERS` is warned about in the form and rejected by the API.

The form also keeps a local draft in `localStorage`, keyed `survey-draft:<technician id>:<survey id>`.
A debounced write (500 ms) follows every keystroke, the last pending edit is flushed when the form
unmounts, and the draft is cleared as soon as the form matches the saved values or the survey is saved
or submitted. Returning to a form that has one restores the box, port, line, capacity, field conditions
and remark, says so at the top, and offers **Discard them** to start again from the saved values. The
key is scoped to the signed-in technician, and GPS is never stored - a position captured minutes ago
must not be resubmitted as a fresh measurement. This local draft is not the offline
queue (#18/#19): the draft rescues a reloaded tab, while the queue is what keeps a saved or
submitted survey until the server has accepted it.

## Status

**Task 1 - scaffold and design system: complete.** Workspaces, design tokens, dark mode, shared UI
primitives and the typed API client.

**Task 2 - backend domain: complete.** Prisma schema for all twelve AGENTS.md #15 entities plus
`line_hops` and `activity_logs`, migrated and seeded against hosted Neon. Implemented and verified:
authentication with role-based authorisation, the #10 technical feasibility engine, the #16 search,
survey creation and assignment, auto-populated form data, the #9 field survey with GPS-gated
submission, supervisor approve/reject/return, the #17 reports with CSV export, #20 activity logging,
and admin user management.

**Task 3 - frontend: complete.** Every AGENTS.md role now has a working interface on top of the
Task 2 API: the technician dashboard and survey queue, the #16 search, the survey detail with the
old network / new network / field survey / feasibility panels, the #9 auto-populated survey form
with the GPS-gated submit, the supervisor review queue with approve / reject / return, the #17
reports, and the admin user management screen. Verified end to end in a headless browser against
the live API: sign-in for all three roles, a `BOX-22` search returning the `LINE-05` route, GPS
capture via `Emulation.setGeolocationOverride`, a real submission, a real supervisor approval, and
every list, report and form rendering its data. `npm run typecheck`, `npm run lint` and
`npm run build` all pass.

**Task 4 - administrator network management: complete.** `/admin/network` adds the #2/#20
management screens on top of new administrator-only endpoints: four tabs for service areas, boxes
and their ports, lines with an ordered route editor, and services with old/new network pickers. The whole
`Service -> Old Network -> Change/Shift -> New Network` record can now be created and corrected
from the UI. Verified against the live API with a 46-check backend suite plus a 26-check
headless-browser suite exercising create, edit, blocked delete and delete for all four resources,
with `npm run typecheck`, `npm run lint` and `npm run build` all passing.

Two backend defects surfaced and were fixed while building this screen:

- **Prisma interactive transactions timed out against the Neon pooler.** The pooler exceeds Prisma's
  5-second interactive-transaction default, so multi-step `$transaction` calls failed with
  *Transaction already closed*. This had silently broken administrator user creation since Task 2 and
  also blocked service create/update. They now use single nested writes, with explicit
  `maxWait`/`timeout` on the one transaction that still needs delete-versus-upsert branching.
- **`GET /network/boxes/:id/ports` ignored its path parameter** and demanded a `boxId` query
  string, so it always failed validation with `422`. It now reads the box id from the path and
  accepts only the optional `status` filter.

Two deliberate deviations from AGENTS.md, both confirmed with the project owner:

- **Offline operation (#18/#19) is out of scope.** Surveys are submitted online. The form keeps a
  local draft of what the technician typed so a reload, a navigation or an expired session does not
  discard it, but there is no queue, retry or conflict handling. *Reversed later: see Task 8.*
- **Surveys are raised by a supervisor or administrator, not by the technician.** Technicians work
  the queue that is assigned to them.

**Task 5 - session revocation: complete.** `User.tokenVersion` (migration
`20260912103707_add_user_token_version`) travels in the JWT as the `ver` claim and is compared on
every authenticated request, closing the gap Task 1-4 left open. Logout and password reset bump the
column, so a copied token stops working immediately instead of surviving until it expires; both
actions are also written to the activity log as `USER_SIGNED_OUT` and `USER_PASSWORD_RESET`.
Verified against the live API with an 18-check suite that replays a revoked cookie and expects
`401`, and the existing 46-check and 9-check backend suites still pass.

One trade-off worth knowing: revocation is per account, not per device, so signing out on one phone
ends that account's other sessions too. That is the cost of a version column over a session table.

**Task 6 - session-expiry handling in the UI: complete.** Revocation only helps if the interface
reacts to it. A 401 now ends the session in the client instead of rendering a "Try again" card that
can never succeed: the API client announces the rejection, the auth provider clears the session, the
signed-in layout returns the user to `/login`, and the form explains that the session ended (a
sign-out on another device, or a password reset). Someone who was never signed in still sees the
plain form, and signing in clears the notice. Verified in a headless browser by revoking a live
technician session from outside the browser and then navigating within the app (11/11 checks), with
the 26-check admin UI suite still green.

**Task 7 - survey draft persistence: complete.** A survey in progress now survives a reload, a
navigation away and an expired session. `client/lib/survey-draft.ts` is a small versioned
`localStorage` store keyed by technician and survey; the survey form restores the box, port, line,
capacity, field conditions and remark from it, writes changes on a 500 ms debounce, flushes the last
edit when the form unmounts, and clears the draft once the form matches the saved values or the
survey is saved or submitted. A restored draft is announced with a **Discard them** action, GPS is
never stored, and the key is technician-scoped so a shared field device never shows one technician's
edits to another. Verified in a headless browser with a 37-check suite covering restore after
navigation and reload, the unmount flush, discard, per-technician isolation, and clearing on save;
the 11-check session suite and the 26-check admin UI suite still pass.

A related defect surfaced while testing: `AsyncBoundary` treated a background refresh as a first
load, so **Save progress** unmounted the form and its "Saved." confirmation was never visible,
throwing away the GPS fix the technician had just captured. The boundary now keeps the current view
mounted while data is refreshed and only takes over the page for the very first load.

**Task 8 - offline field operation: complete.** #18/#19 are implemented rather than deferred, which
supersedes the "out of scope" note in Task 4 above. Migration `20260917000000_offline_sync` adds
`surveys.version` and a `sync_receipts` table; `GET /sync/pull` returns the technician's snapshot and
`POST /sync/push` applies one queued `SAVE` or `SUBMIT` with idempotent retries and a version-checked
conflict response. The client keeps the snapshot, the queue and the conflicts in IndexedDB, and one
status indicator reports all of it.

**Task 9 - error boundaries, richer logging, system configuration, app-shell worker: complete.**

- **Route boundaries.** `client/app/error.tsx`, `client/app/(app)/error.tsx`,
  `client/app/global-error.tsx` and `client/app/not-found.tsx` share
  `client/components/app/route-error.tsx`. The signed-in boundary renders inside the shell, so a
  failing screen keeps the navigation and the sync indicator and a technician can still reach their
  other surveys.
- **Submit confirmation.** Submitting closes the survey for editing, so the form asks first.
  Validation that would block the submit still runs before the dialog - there is no point confirming
  an action that cannot proceed - and the dialog repeats the target box, port and line, the
  feasibility verdict and the GPS accuracy being submitted.
- **Richer activity logging.** `SURVEY_OPENED` is recorded when a technician opens a survey to work
  on it, deduplicated inside the configured window so a reload is not a new visit, and
  `SURVEY_SAVED` names the fields that actually changed instead of only reporting that a save
  happened.
- **System configuration.** `/admin/settings` over the new `/settings` endpoints lets an
  administrator change the GPS thresholds and the repeat-open window without a redeploy. The survey
  form reads its GPS limit from the server response instead of hardcoding it.
- **Activity log screen.** `/admin/activity` surfaces the audit trail the backend had been recording
  all along, with a grouped action filter, free-text search and pagination. `client/lib/activity.ts`
  is the single place that decides how each action is labelled, coloured and grouped, so the survey
  timeline and the audit trail cannot drift apart.
- **App-shell service worker.** `client/public/sw.js` and an offline fallback page, described under
  Frontend above.

Verified against the running app: the settings API including its range and empty-body rejections, the
admin settings screen in a headless browser (load, out-of-range rejection, reset to default, save
round trip, "last changed by"), the activity log with its action filter, and the service worker in a
production build - shell and page caches populated, a cached route served with `transferSize: 0`
while the server was stopped, and an uncached route falling back to `/offline.html`.

Next: nothing in the AGENTS.md scope is outstanding. The remaining work is hardening rather than
features - a per-device session table if "log out everywhere" proves too blunt for technicians who
carry more than one device, and a background sync registration once the field app is installed as a
standalone app instead of a browser tab.
