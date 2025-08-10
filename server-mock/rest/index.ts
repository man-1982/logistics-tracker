import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { ENV } from "../types/env";
import { Delivery, Driver } from "../types/api";
import { randomUUID } from "crypto";

// --- In-memory store (seed) ---
const drivers: Driver[] = [
  { id: "d1", name: "Alice", status: "active", vehicle: "Van 12" },
  { id: "d2", name: "Bob", status: "active", vehicle: "Bike 7" },
  { id: "d3", name: "Chloe", status: "pause", vehicle: "Car 21" }
];

const deliveries: Delivery[] = [
  { id: "o1001", title: "Order #1001", customer: "Store Sadovaya", address: "Sadovaya, 15", etaMinutes: 25, status: "assigned", driverId: "d1" },
  { id: "o1002", title: "Order #1002", customer: "Store Sheriff-1", address: "Main St 5", etaMinutes: 40, status: "completed", driverId: "d2" },
  { id: "o1003", title: "Order #1003", customer: "Gas Station Green", address: "Green Tir.", etaMinutes: 10, status: "assigned", driverId: null }
];

// --- App ---
const app = express();
app.use(express.json());

/**
 * A whitelist of allowed domains for Cross-Origin Resource Sharing (CORS).
 * This is loaded from the application's environment configuration.
 * @example ['http://localhost:5173', 'https://my-production-app.com']
 */
const corsOrigins = ENV.CORS_ORIGINS;

/**
 * Configures and applies the CORS middleware to the Express app.
 */
app.use(cors({
  /**
   * A function to dynamically determine if a request's origin is allowed.
   * @param origin - The value of the `Origin` header from the incoming request.
   *                 This can be `undefined` for same-origin or server-to-server requests.
   * @param cb - The callback to inform the `cors` middleware whether to allow the request.
   *             It takes the form `(error, allow)`.
   */
  origin: (origin, cb) => {
    // Allow requests that don't have an `Origin` header.
    if (!origin) {
      return cb(null, true);
    }

    // Check if the incoming origin is present in our predefined whitelist.
    if (corsOrigins.includes(origin)) {
      // If the origin is in the whitelist, allow the request.
      return cb(null, true);
    }

    // If the origin is not in the whitelist, block the request by passing an error.
    return cb(new Error("CORS blocked: This origin is not allowed."), false);
  },
  /**
   * Allows the frontend to include credentials (like cookies, authorization headers,
   * or TLS client certificates) in its cross-origin requests.
   */
  credentials: true,
}));

// --- Auth (mock) ---
function signToken(sub: string) {
  return jwt.sign({ sub }, ENV.JWT_SECRET, { expiresIn: ENV.ACCESS_TOKEN_TTL_SEC });
}

/**
 * Express middleware for JWT-based authentication.
 *
 * This middleware checks for a JWT in the `Authorization` header of the request.
 * The header is expected to be in the format "Bearer
 **/
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
  const token = h.slice("Bearer ".length);
  try {
    jwt.verify(token, ENV.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/login", (req, res) => {
  // Accept any username/password for mock
  const { username = "dispatcher" } = req.body ?? {};
  const token = signToken(username);
  res.json({ accessToken: token, user: { username, role: "dispatcher" } });
});

// --- Resources ---
app.get("/api/drivers", auth, (_req, res) => res.json({ items: drivers }));
app.get("/api/deliveries", auth, (_req, res) => res.json({ items: deliveries }));

// --- Actions ---
app.post("/api/deliveries/:id/reassign", auth, (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body as { driverId: string };
  const d = deliveries.find((x) => x.id === id);
  if (!d) return res.status(404).json({ error: "not_found" });
  if (!drivers.find((dr) => dr.id === driverId)) return res.status(400).json({ error: "invalid_driver" });
  d.driverId = driverId;
  d.status = d.status === "completed" ? "completed" : "assigned";
  res.json({ ok: true, delivery: d });
});

app.post("/api/drivers/:id/pause", auth, (req, res) => {
  const dr = drivers.find((x) => x.id === req.params.id);
  if (!dr) return res.status(404).json({ error: "not_found" });
  dr.status = "pause";
  res.json({ ok: true, driver: dr });
});

app.post("/api/drivers/:id/resume", auth, (req, res) => {
  const dr = drivers.find((x) => x.id === req.params.id);
  if (!dr) return res.status(404).json({ error: "not_found" });
  dr.status = "active";
  res.json({ ok: true, driver: dr });
});

app.post("/api/deliveries/:id/complete", auth, (req, res) => {
  const d = deliveries.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  d.status = "completed";
  d.etaMinutes = 0;
  res.json({ ok: true, delivery: d });
});

// helper: create a new delivery quickly (for demos)
app.post("/api/deliveries", auth, (req, res) => {
  const body = req.body ?? {};
  const id = body.id ?? randomUUID();
  const delivery: Delivery = {
    id,
    title: body.title ?? `Order ${id}`,
    customer: body.customer ?? "Unknown",
    address: body.address ?? "Unknown",
    etaMinutes: body.etaMinutes ?? 30,
    status: "assigned",
    driverId: body.driverId ?? null,
  };
  deliveries.unshift(delivery);
  res.status(201).json({ ok: true, delivery });
});

app.listen(ENV.PORT, () => {
  console.log(`[REST] listening on :${ENV.PORT}`);
});
