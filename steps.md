# STEPS.md

## 0) Prerequisites
1. Install Node.js ≥ 18, pnpm or npm.
2. Acquire MAPBOX_TOKEN.
3. Initialize Git repository.

## 1) Repo & Tooling
1. `mkdir logistics-tracker && cd logistics-tracker`
2. Scaffold: `pnpm create vite app --template react-ts`
3. `mkdir server-mock`
4. Add ESLint/Prettier/Vitest.

## 2) Project Structure
1. Create folders:
    - `app/src/{api,auth,components,features/{drivers,deliveries,history},store,pages,hooks,types,utils}`
    - `server-mock/{rest,ws}`
2. Commit initial structure.

## 3) Mock REST API
1. Init: `cd server-mock && pnpm init -y`
2. Install: `pnpm add express cors jsonwebtoken` + `pnpm add -D nodemon ts-node typescript`
3. Implement endpoints: `/api/auth/login`, `/api/auth/impersonate`, `/api/auth/stop-impersonation`, `/api/drivers`, `/api/deliveries/active`.
4. Add script: `"rest": "nodemon --watch rest --exec ts-node rest/index.ts"`.

## 4) Mock WebSocket Server
1. Install: `pnpm add ws uuid`
2. Implement WS at `ws://localhost:8081/rt` with schema (event/cmd/ack/error/pong).
3. Emit `driver.update` every 5–10s (lat/long only).
4. Handle cmds: `driver.pause`, `driver.resume`, `delivery.complete`, `delivery.reassign`, `state.sync`.
5. Add script: `"ws": "nodemon --watch ws --exec ts-node ws/index.ts"`.
6. Add `"dev": "npm-run-all --parallel rest ws"`.

## 5) Frontend Setup
1. `cd ../app`
2. Env: `.env.local` → `VITE_API_BASE`, `VITE_WS_URL`, `VITE_MAPBOX_TOKEN`.
3. Install: `pnpm add @reduxjs/toolkit react-redux mapbox-gl`.

## 6) State Management
1. Configure store in `src/store/index.ts`.
2. Create slices: `authSlice`, `driversSlice`, `deliveriesSlice`, `uiSlice`.
3. Add selectors (Reselect) for filtered/sorted drivers.

## 7) API Layer
1. `src/api/rest.ts` (login, impersonate, bootstrap data).
2. `src/api/ws.ts` (connect/reconnect, heartbeats, send/subscribe, state.sync).
3. TS types for envelopes and payloads.

## 8) Routing & Guards
1. Setup routes: `/login`, `/dashboard`, `/history`.
2. Implement role guard (dispatcher/admin).
3. Add admin impersonation controls.

## 9) Mapbox Integration
1. `MapView.tsx` with Mapbox init.
2. GeoJSON source/layer for driver markers.
3. Select/flyTo on driver selection.

## 10) Driver List
1. `DriverList.tsx` with columns: Name/ID, Status, ETA, Lat/Long, Last Update, Actions.
2. Filters: Status, ETA range, Name.
3. Sorting: Status, ETA, Name.

## 11) Real-Time Updates
1. Wire WS events to reducers (`driver.update`, `driver.statusChanged`, `delivery.*`).
2. Ensure consistent updates for map and list.

## 12) Optimistic Actions
1. Command dispatcher with `txnId`, optimistic apply, rollback on `error` ack.
2. Actions: Reassign, Pause/Resume, Complete.

## 13) History & Analytics
1. History page: table + filters (date, status, driver).
2. KPI tiles: Deliveries Today, Avg ETA, On-time %.
3. Seed mock history in REST.

## 14) Error/Empty/Reconnect
1. Global toasts.
2. Exponential WS reconnect + `state.sync`.
3. Empty states and skeletons.

## 15) Tests & Scripts
1. Unit tests for reducers/selectors and WS command flow.
2. Optional E2E happy path.
3. Add scripts: build, dev, lint, test (app and server-mock).

## 16) Definition of Done
1. WS connect + initial render.
2. <500ms UI update on `driver.update`.
3. Filters/sorts stable under streaming updates.
4. Optimistic actions with rollback.
5. Admin impersonation working.
6. History + KPIs from mock data.
7. Reconnect + state sync verified.
8. Lint/test/build passing.
