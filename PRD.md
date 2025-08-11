# Product Requirements Document (PRD)
## Real-Time Logistics Tracker

---

## 1. Overview
The **Real-Time Logistics Tracker** is a production-ready web application for managing and tracking delivery operations. It provides dispatchers and admins with live driver tracking, delivery status updates, dispatch actions, and historical analytics. The backend is **mocked for Phase 1** but the contracts are defined for seamless future integration.

**Tech Stack (Phase 1)**
- Frontend: React + TypeScript
- State: Redux Toolkit (or equivalent)
- Mapping: Mapbox
- Real-Time: WebSocket (mocked)
- Auth: JWT or OAuth (mocked)
- Testing: Jest + React Testing Library
- Tooling: ESLint + Prettier

---

## 2. Goals
- Live monitoring of driver locations on a map.
- Real-time updates of statuses and ETAs (ETA may be mocked).
- Simple dispatch actions with optimistic UI and rollback.
- Role-based access (dispatcher, admin) with **admin impersonation**.
- Basic historical data & analytics (mocked dataset).
- Production-grade architecture and contracts even with mocked services.

---

## 3. Stakeholders & Roles

**Stakeholders:** Product Owner, Engineering, Dispatchers, Admins, Drivers.

**Roles & Permissions**
- **Dispatcher**
    - View live map & driver list; filter/sort by status, ETA, name.
    - Actions: reassign delivery, pause/resume driver, mark delivery completed.
- **Admin**
    - All dispatcher capabilities.
    - Manage users (mocked).
    - **Impersonate** another user from within the app.
- **Driver**
    - Passive in Phase 1 (no UI); data originates from mock server streams.

---

## 4. Scope

### In Scope (Phase 1)
- Mapbox live map with real-time driver markers.
- Driver dashboard with filters/sort (status, ETA, name).
- Actions with optimistic UI (reassign, pause/resume, complete).
- Basic history/analytics page (mocked).
- Auth (JWT/OAuth) + role guard + admin impersonation.
- Mock **WebSocket** server and minimal **REST** endpoints.

### Out of Scope (Phase 1)
- Offline mode (Phase 2).
- Advanced analytics, geofencing, push notifications.
- Native/mobile driver app.

---

## 5. Functional Requirements

### 5.1 Live Map Visualization
- Display all active drivers as Mapbox markers.
- Selecting a driver highlights marker and opens detail panel.
- Marker tooltip: `Driver Name/ID • Status • Last Update hh:mm:ss`.

### 5.2 Driver Dashboard
- List columns: **Name/ID**, **Status** (`Delivering|Paused|Idle`), **ETA** (mock), **Last Update**, **Current Location** (`lat,long`).
- **Filter** by Status, ETA range, Name (substring).
- **Sort** by Status (alpha), ETA (asc/desc), Name (alpha).

### 5.3 Real-Time Updates
- Receive WebSocket events for driver location and status.
- UI applies updates within **< 500 ms** of event receipt.
- State consistency across map and list is mandatory.

### 5.4 Dispatch Actions (Optimistic UI)
- **Reassign delivery** (choose target driver).
- **Pause/Resume driver**.
- **Mark delivery as completed**.
- Client sends command with a `txnId`; UI updates optimistically.
- On **ack:success** → keep state; on **ack:error** → **rollback** and show error.
- Errors rendered as non-blocking toast + inline banner in the detail panel.

### 5.5 Auth & Roles
- Login via mocked JWT or OAuth authorization code flow.
- Role guard on routes and actions.
- Admin **impersonation** (switch identity) visible in header with “Return to admin” control.

### 5.6 History & Analytics (Basic)
- History table: Delivery ID, Driver, Status, Start/End timestamps, ETA (final), Duration.
- Filters: date range, status, driver.
- KPIs (mocked): Deliveries today, Avg ETA, % On-time.

---

## 6. Non-Functional Requirements
- **Scale:** 500 concurrent drivers (target) without jank; 60 FPS map pan/zoom on modern laptops.
- **Latency:** < 500 ms from WebSocket event receipt to rendered UI.
- **Availability:** Degrade gracefully if WS drops; auto-reconnect with backoff.
- **Security:** Token attached to WS & REST; role checks client-side (Phase 1 mock).
- **Compatibility:** Latest Chrome/Edge/Firefox/Safari.
- **Quality:** 70%+ unit test coverage on reducers/selectors/action handlers.

---

## 7. Wireframe Placeholders

### 7.1 Main Dispatcher Dashboard
    WIREFRAME] | Map (left 70%) | Driver List (right 30%)
    Header: App name | Search (name) | Filters (status, ETA) | User menu (role, impersonation)
    Map: clustered markers; selected driver emphasized
    List: rows with action menu (⋮): Reassign | Pause/Resume | Complete


### 7.2 Driver Detail Panel / Modal
[WIREFRAME] Driver Card
Header: Name/ID • Status • Last Update
Body: Location lat,long • ETA • Active Delivery ID
Actions: Reassign [dropdown], Pause/Resume [button], Complete [button]
Footer: Error/Success toasts area


### 7.3 History & Analytics
WIREFRAME] History Table + KPI Tiles
KPI row: Deliveries Today | Avg ETA | On-time %
Filters: Date Range, Status, Driver
Table: Delivery ID | Driver | Status | Start | End | ETA | Duration


---

## 8. Assumptions
- Coordinates are **latitude & longitude only** (no altitude/speed/bearing).
- WebSocket updates per driver every **5–10 seconds** (configurable in mock).
- Driver IDs are globally unique and stable.
- Mapbox API key is available for dev/prod.

---

## 9. Dependencies
- Mapbox GL JS
- Redux Toolkit (or equivalent state mgmt)
- ws (Node) for mock WebSocket server
- json-server or Express (mock REST)
- JWT/OAuth libs for mock tokens

---

## 10. Risks & Mitigations
- **High update cadence → UI thrash** → Batch updates, use requestAnimationFrame, memoized selectors.
- **WS disconnects** → Auto-reconnect with jittered backoff; queue commands until connected.
- **Divergence mock vs real API** → Versioned contracts, strict schemas, typed API layer.

---

## 11. Mock Interfaces (Authoritative for Phase 1)

### 11.1 Authentication (Mock REST)
**Base URL:** `http://localhost:8080/api`

- **POST** `/auth/login`
    - Req: `{ "username": string, "password": string }`
    - Res: `200 OK`
      ```json
      { "accessToken":"<jwt>", "expiresIn":3600, "user":{"id":"u1","name":"Alice","role":"admin"} }
      ```
- **POST** `/auth/impersonate`
    - Auth: Bearer `<jwt>` (admin only)
    - Req: `{ "targetUserId": "dispatcher-42" }`
    - Res: `200 OK` `{ "accessToken":"<jwt-impersonated>", "impersonating": true, "originalUserId":"u1" }`
- **POST** `/auth/stop-impersonation`
    - Res: `200 OK` `{ "accessToken":"<jwt-admin>", "impersonating": false }`

### 11.2 Drivers & Deliveries (Mock REST)
- **GET** `/drivers`
    - Res: `200 OK`
      ```json
      [{ "id":"d-100", "name":"John D", "status":"Delivering", "eta":"15m", "lat":40.7128, "long":-74.0060, "lastUpdate":"2025-08-09T21:00:00Z" }]
      ```
- **GET** `/deliveries/active`
    - Res: `200 OK`
      ```json
      [{ "id":"del-501","driverId":"d-100","status":"Delivering","startedAt":"2025-08-09T20:30:00Z" }]
      ```

> **Note:** In the mock, server-side effects for commands are primarily via WebSocket echoes (see below). REST is read-mostly for bootstrap screens.

---

### 11.3 WebSocket (Mock) — **Primary Real-Time Channel**

**URL:** `ws://localhost:8081/rt`  
**Protocol:** JSON text frames  
**Auth:** `Authorization: Bearer <jwt>` passed as a **query param** `?token=` or via `Sec-WebSocket-Protocol` (either is acceptable in mock; production should prefer headers/subprotocol).

#### 11.3.1 Message Envelope (All Frames)
```json
{
  "v": 1,                // schema version
  "type": "event|cmd|ack|error|pong",
  "event": "driver.update",   // when type=event
  "cmd": "driver.pause",      // when type=cmd
  "txnId": "uuid-optional",   // set by client on commands; echoed in ack/error
  "ts": "2025-08-09T21:00:00Z",
  "data": { /* type-specific */ }
}
```
#### 11.3.2 Server → Client Events

driver.update — location or ETA/status changes (lat/long only)
```json {
"v":1,"type":"event","event":"driver.update","ts":"2025-08-09T21:00:00Z",
"data":{"driverId":"d-100","lat":40.7132,"long":-74.0055,"status":"Delivering","eta":"14m","lastUpdate":"2025-08-09T21:00:00Z"}
}
```
delivery.completed
```json
{ "v":1,"type":"event","event":"delivery.completed","ts":"...","data":{"deliveryId":"del-501","driverId":"d-100","completedAt":"2025-08-09T21:05:00Z"} }
```

delivery.reassigned
```json
{ "v":1,"type":"event","event":"delivery.reassigned","ts":"...","data":{"deliveryId":"del-501","fromDriverId":"d-100","toDriverId":"d-200"} }
```
driver.statusChanged (pause/resume)
```json
{ "v":1,"type":"event","event":"driver.statusChanged","ts":"...","data":{"driverId":"d-100","status":"Paused"} }
ping (optional server heartbeat) → client should reply with pong.
```
Event Cadence (mock defaults)
driver.update: every 5–10s per active driver, jittered ±3s.

#### 11.3.3 Client → Server Commands (Optimistic UI)
The UI immediately updates local state and sends a command with txnId. 
The server responds with ack (success or error). On error, the UI rolls back using the stored pre-change snapshot.
driver.pause
```json
{ "v":1,"type":"cmd","cmd":"driver.pause","txnId":"uuid-1","ts":"...","data":{"driverId":"d-100"} }
```
driver.resume
```json
{ "v":1,"type":"cmd","cmd":"driver.resume","txnId":"uuid-2","ts":"...","data":{"driverId":"d-100"} }
```

delivery.complete
```json
{ "v":1,"type":"cmd","cmd":"delivery.complete","txnId":"uuid-3","ts":"...","data":{"deliveryId":"del-501","driverId":"d-100"} }
```
delivery.reassign
```json
{ "v":1,"type":"cmd","cmd":"delivery.reassign","txnId":"uuid-4","ts":"...","data":{"deliveryId":"del-501","toDriverId":"d-200"} }
```
Acknowledgements
Success ack
```json
{ "v":1,"type":"ack","txnId":"uuid-4","ts":"...","data":{"status":"ok"} }
```
Error ack
```json
{ "v":1,"type":"error","txnId":"uuid-4","ts":"...","data":{"code":"CONFLICT","message":"Driver d-200 is Paused"} }
```
Heartbeats & Connection
Client sends
```json
{"type":"cmd","cmd":"ping"}
``` 
every 30s if no traffic; server replies {"type":"pong"}.
Auto-reconnect with exponential backoff: 1s, 2s, 4s, max 30s + jitter.
On reconnect, client should request a state sync:
```json
{ "v":1,"type":"cmd","cmd":"state.sync","txnId":"uuid-5","ts":"...","data":{} }
```
Server responds with:
```json
{
"v":1,"type":"ack","txnId":"uuid-5","ts":"...",
"data":{
"drivers":[
{"id":"d-100","name":"John D","status":"Delivering","eta":"12m","lat":40.7135,"long":-74.0051,"lastUpdate":"..."}
],
"activeDeliveries":[{"id":"del-501","driverId":"d-100","status":"Delivering","startedAt":"..."}]
}
}
```
Schema Notes
Coordinates: lat (number), long (number) only.
Status enum: Delivering | Paused | Idle.
All timestamps .
12. Redux/State Guidelines (Informative, not prescriptive)
    Slices: auth, drivers, deliveries, ui.
    Selectors: memoize derived lists (filtered/sorted).
    WS Handler: single event channel; normalize payloads; batch reducer commits per tick.
13. Acceptance Criteria
    WS Connect & Bootstrap: After login, app opens WS, receives initial state.sync or fetches REST /drivers, renders map + list.
    Update Latency: On driver.update, list row and marker update < 500 ms.
    Filters/Sort: Filtering by status/ETA/name and sorting by status/ETA/name work and are stable after new WS updates.
    Optimistic Actions: Reassign / Pause / Resume / Complete update UI immediately; on error ack, state rolls back within < 300 ms, and a toast appears.
    Impersonation: Admin can impersonate a dispatcher; header shows impersonation banner; “Return to admin” restores original identity.
    Reconnect: Network drop simulated → client reconnects and requests state.sync; UI state matches server snapshot.
    Schema Compliance: All WS messages match the defined envelope; unknown fields are ignored; invalid messages are logged and safely skipped.
    History View: Table renders mocked history and supports date/status/driver filters; KPIs compute from the same dataset.
14. Phase 2 (Future Enhancements)
    Offline mode with action queue & conflict resolution.
    Geofencing (polygon alerts), proximity notifications.
    Advanced analytics and map overlays (routes, heatmaps).
    Driver mobile app with bi-directional actions.
    SSO, audit logs, PII policy, and observability (tracing).
