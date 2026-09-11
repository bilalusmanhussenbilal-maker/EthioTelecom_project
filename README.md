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
â”œâ”€â”€ client/                 # Next.js frontend
â”‚   â”œâ”€â”€ app/                # App Router routes, layout, globals.css (design tokens)
â”‚   â”œâ”€â”€ components/         # theme provider + shared UI primitives
â”‚   â”œâ”€â”€ lib/                # utils and the typed API client
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ server/                 # Express backend
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ config/         # validated environment configuration
â”‚   â”‚   â”œâ”€â”€ controllers/    # request/response translation
â”‚   â”‚   â”œâ”€â”€ services/       # business logic
â”‚   â”‚   â”œâ”€â”€ routes/         # route definitions
â”‚   â”‚   â”œâ”€â”€ models/         # data layer
â”‚   â”‚   â”œâ”€â”€ middleware/     # logging, error handling
â”‚   â”‚   â”œâ”€â”€ utils/          # logger, ApiError
â”‚   â”‚   â”œâ”€â”€ app.ts          # express app wiring
â”‚   â”‚   â””â”€â”€ server.ts       # http entrypoint
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ package.json            # workspaces + root scripts
â”œâ”€â”€ .env.example
â””â”€â”€ AGENTS.md
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
| `POST` | `/auth/logout` | public | Clear the session cookie |
| `GET` | `/auth/me` | any role | Current user together with the technician profile |

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
## Frontend notes

- `client/app/globals.css` holds the design tokens and the `@theme inline` mapping that exposes
  them as Tailwind utilities. Dark mode is class based (`.dark` on `<html>`) and is applied before
  first paint by an inline script in the root layout.
- Shared primitives live in `client/components/ui` and stay presentational.
- UI code never calls `fetch` directly; it goes through `client/lib/api/client.ts`.

## Status

**Task 1 - scaffold and design system: complete.** Workspaces, design tokens, dark mode, shared UI
primitives and the typed API client.

**Task 2 - backend domain: complete.** Prisma schema for all twelve AGENTS.md #15 entities plus
`line_hops` and `activity_logs`, migrated and seeded against hosted Neon. Implemented and verified:
authentication with role-based authorisation, the #10 technical feasibility engine, the #16 search,
survey creation and assignment, auto-populated form data, the #9 field survey with GPS-gated
submission, supervisor approve/reject/return, the #17 reports with CSV export, #20 activity logging,
and admin user management.

Two deliberate deviations from AGENTS.md, both confirmed with the project owner:

- **Offline operation (#18/#19) is out of scope.** Surveys are submitted online, though the form
  still preserves in-progress input and GPS is captured at submit time.
- **Surveys are raised by a supervisor or administrator, not by the technician.** Technicians work
  the queue that is assigned to them.

Known limitation worth fixing before production: logout clears the cookie but does not invalidate the
JWT server side, so a copied token stays valid until it expires (12h). A token version column on
`users`, or a short TTL with a refresh token, would close that.

Next: the technician, supervisor and administrator interfaces.