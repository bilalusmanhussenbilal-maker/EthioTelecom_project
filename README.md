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

### How it is put together

- The session is an httpOnly cookie on the API origin, so the signed-in area is client rendered and
  `client/app/(app)/layout.tsx` gates it on `useAuth()`. Server Components are still used for the
  public shell and the landing page.
- `client/lib/api/` holds one module per backend resource on top of the shared `client.ts` fetch
  wrapper; UI components never call `fetch` directly.
- `client/lib/hooks/use-async.ts` covers the loading / ready / error states every API-backed view
  needs, including the 401 wording so an expired session does not look like a broken connection.
- `client/components/app/` holds the cross-feature pieces (shell, alerts, async boundary, page
  header, stat cards, status badges) and `client/components/<feature>/` holds the feature views.
- `client/lib/domain.ts` is the single source of truth for every enum label and colour tone, so
  status wording stays consistent across dashboards, tables and forms.
- `client/app/globals.css` holds the design tokens and the `@theme inline` mapping that exposes
  them as Tailwind utilities. Dark mode is class based (`.dark` on `<html>`) and is applied before
  first paint by an inline script in the root layout.
- Layout is mobile first, because technicians use phones in the field.

### Survey form behaviour

The form loads `GET /surveys/:id/form-data` plus `GET /network/options`, so service, old network
and new network are already filled in. The technician only sets the field observations, the target
box/port/line and the remark. The feasibility badge re-checks on save, and the boxes and ports the
API offers are already filtered to assignable ones. **GPS is required to submit** - the submit
button is blocked until a fix is captured, and the API rejects a submission without one. A fix
worse than `GPS_MAX_ACCURACY_METERS` is warned about in the form and rejected by the API.
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

- **Offline operation (#18/#19) is out of scope.** Surveys are submitted online, though the form
  still preserves in-progress input and GPS is captured at submit time.
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

Next: nothing in the AGENTS.md scope is outstanding. The offline sync APIs (#18/#19) stay out of
scope by decision, so the remaining work is hardening rather than features - a per-device session
table if "log out everywhere" proves too blunt for technicians who carry more than one device.
