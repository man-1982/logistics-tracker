# Logistics Tracker (Monorepo)

Here's our logo (hover to see the title text):


![alt text](/doc/img-1.png "Map")

![alt text](/doc/img-2.png "Driver list")

![alt text](/doc/img-3.png "Delivery list")



[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 2"


A project for a **high-scale delivery-tracking system** using **Node 20+**, **React 18+**, 
**TypeScript (strict)**, **Redux Toolkit**, **React Query**, **Tailwind v4**, and **Mapbox GL JS**.

This repo is a **pnpm workspace** with two packages:

```
logistics-tracker/
  app/          # React + Vite + TS + Tailwind v4
  server-mock/  # Express REST + WebSocket broadcaster (tsx watcher)
```

## Quick Start

```bash
corepack enable         # ensures pnpm is available
node -v                 # must be >= 20
pnpm -v

# clone/init if needed, then:
pnpm install

# envs (see below), then in 2 terminals:
pnpm --filter server-mock dev   # :8080 (REST) and :8081/rt (WS)
pnpm --filter app dev           # :5173
```

*   Open `http://localhost:5173`
*   Login with any username/password (mock auth).
*   You should see **Drivers (3)** and incoming WS messages (`hello` + `gps`).

## Environment Variables

### app/.env.local

```
VITE_API_BASE=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8081/rt
VITE_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN
```

> Keep `VITE_` prefix for any variable you need at build/runtime in the client.

### server-mock/.env.local

```
PORT=8080
WS_PORT=8081
WS_PATH=/rt
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,*
JWT_SECRET=dev-only-not-secure
ACCESS_TOKEN_TTL_SEC=3600
GPS_TICK_MS=2000
```

> The server loads `.env.local` and `.env` relative to `server-mock/` (path-robust).
> `CORS_ORIGINS` accepts a comma-separated list.

## Scripts

At repo root:

*   `pnpm dev` — run all packages in parallel
*   `pnpm lint` — lint all packages
*   `pnpm typecheck` — type-check all packages
*   `pnpm test` — test all packages (app uses Vitest)

Package overrides:

*   `pnpm --filter app dev|build|lint|typecheck|test`
*   `pnpm --filter server-mock dev|typecheck`

## Tech & Structure

### Frontend (`app/`)

*   **Vite (React + TS)** with **strict** TS (`tsconfig.settings.json`)
*   **Redux Toolkit**: `auth` (token/user), **`telemetry`** (live GPS per driver)
*   **React Query**: server data (drivers, deliveries) with Zod-validated responses
*   **WS client**: connects post-login; pushes `gps` updates into `telemetry`
*   **Tailwind v4**: via `@tailwindcss/vite` plugin; CSS-first import in `src/index.css`

Key files:

```
app/src/
  lib/config.ts       # typed env loader (Zod)
  lib/api.ts          # typed fetch wrapper + schemas (Zod)
  lib/queryClient.ts  # React Query client
  lib/ws.ts           # minimal WS helper
  store/              # RTK store, authSlice, telemetrySlice
  features/
    auth/LoginForm.tsx
    drivers/DriversList.tsx
    map/LiveMap.tsx   # (added in STEP 5)
  App.tsx, main.tsx
```

### Backend (`server-mock/`)

*   **Express** (REST) and **ws** (WebSocket)
*   **tsx** watcher for TS + ESM DX (no ts-node flags needed)
*   **Zod**-validated env
*   **JWT (mock)** login; all protected routes require `Authorization: Bearer <token>`

Endpoints:

*   `POST /api/auth/login` → `{ accessToken, user }`
*   `GET /api/health` → `{ ok: true }`
*   `GET /api/drivers` (auth)
*   `GET /api/deliveries` (auth)
*   Actions (auth): `POST /api/drivers/:id/pause|resume`, `POST /api/deliveries/:id/complete`, `POST /api/deliveries/:id/reassign`

WebSocket:

*   `ws://localhost:8081/rt`
*   Envelope: `{ v:1, type:"hello"|"gps", ts: ISO, data: any }`
*   `gps` payload: `{ driverId, lat, lng }` (random-walk per driver)

## Development Conventions

*   **Types first**: validate all server responses with **Zod** at the client boundary.
*   **State model**:
    *   RTK → UI/auth client state (e.g., modal visibility, live GPS).
    *   React Query → server/cacheable data (drivers, deliveries, history).
*   **ESM** everywhere. For the server we use `tsx watch` to avoid ESM friction.
*   **Tailwind v4**: import it once in `src/index.css`, use utilities in components.


## Security & Privacy (dev-mode)

*   JWT secret is **dev-only**; do not reuse in production.
*   CORS is restricted to local dev origins.
*   No PII is persisted; the mock store is in-memory.

## Glossary

*   **ETA** — *Estimated Time of Arrival*. In this prototype it’s a simple integer (minutes). 
We’ll refine computation from routing later.

## Roadmap (Next Steps)

1.  **UI/UX improvements**





## License

MIT (for the teaching repo). Replace as needed.
