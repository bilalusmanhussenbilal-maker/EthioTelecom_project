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

```http
GET /api/v1/health
```

```json
{
  "status": "ok",
  "service": "survey-api",
  "environment": "development",
  "apiPrefix": "/api/v1",
  "uptimeSeconds": 12.345,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Errors use a single envelope so the client can render them uniformly:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No route matches GET /api/v1/nope"
  }
}
```

## Frontend notes

- `client/app/globals.css` holds the design tokens and the `@theme inline` mapping that exposes
  them as Tailwind utilities. Dark mode is class based (`.dark` on `<html>`) and is applied before
  first paint by an inline script in the root layout.
- Shared primitives live in `client/components/ui` and stay presentational.
- UI code never calls `fetch` directly; it goes through `client/lib/api/client.ts`.

## Status

Task 1 (scaffold and design system) is complete: workspaces, design tokens, theme switching,
shared UI primitives, typed API client, and the Express server with logging, validation and error
handling.

Next: domain types and the data model, followed by the survey workflow screens.
