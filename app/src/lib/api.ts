import { z } from "zod";
import { CONFIG } from "./config";

// Define User type
// TODO move to separate implementation
export const User = z.object({
  username: z.string(),
  role: z.string(),
});
export type User = z.infer<typeof User>;

export const AuthResponse = z.object({
  accessToken: z.string().min(1),
  user: User,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

// Define a Driver type and DriversList

//@see server-mock/types/api.ts
export const MachineStatus = z.enum(["delivering",  "paused",  "idle", "alarm"]);
export type MachineStatus = z.infer<typeof MachineStatus>;

export const Driver = z.object({
  id: z.string(),
  name: z.string(),
  status: MachineStatus,
  vehicle: z.string().optional(),
});
export type Driver = z.infer<typeof Driver>;
const DriversList = z.object({ items: z.array(Driver) });

// Define Delivery type and DeliveriesList
const DeliveryStatus = z.enum([
  "assigned",
  "in_progress",
  "completed",
  "cancelled"
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;
export const Delivery = z.object({
  id: z.string(),
  title: z.string(),
  customer: z.string(),
  address: z.string(),
  etaMinutes: z.number(),
  deliveryStatus: DeliveryStatus,
  driverId: z.string().nullable().optional(),
});
export type Delivery = z.infer<typeof Delivery>;
const DeliveriesList = z.object({ items: z.array(Delivery) });

//Methods
type HttpMethod = "GET" | "POST";

function makeHeaders(
  token?: string,
  extra?: Record<string, string> | undefined,
  ): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if(token){
    headers.set("Authorization", `Bearer ${token}`);
  }
  if(extra){
    for(const [key, value] of Object.entries(extra)){
      if(value != null){
        headers.set(key, value);
      }
    }
  }
  return headers;
}

/**
 * A common helper function to make requests to the API.
 * It handles JSON serialization, authentication headers, and response validation with Zod.
 */
async function request<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: unknown;
    token?: string; schema: z.ZodType<T>,
    headers?: Record<string, string> | undefined;
  },
): Promise<T> {
  const res = await fetch(`${CONFIG.apiBase}${path}`, {
    method: opts.method ?? "GET",
    headers: makeHeaders(opts.token, opts.headers),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
  }
  const json = (await res.json()) as unknown;
  return opts.schema.parse(json);
}

/**
 * A collection of API methods for interacting with the backend.
 */
export const api = {

  /**
   * Authenticates a user and returns an access token.
   */
  login: (username: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: { username, password },
      schema: AuthResponse,
    }),

  /**
   * Fetches a list of all drivers.
   */
  listDrivers: (token: string) =>
    request("/drivers", { token, schema: DriversList }),

  /**
   * Fetches a list of all deliveries.
   */
  listDeliveries: (token: string) =>
    request("/deliveries", { token, schema: DeliveriesList }),

  /**
   * Pauses a driver's activity.
   */
  pauseDriver: (token: string, id: string) =>
    request(`/drivers/${id}/pause`, { method: "POST", token, schema: z.any() }),

  /**
   * Resumes a driver's activity.
   */
  resumeDriver: (token: string, id: string) =>
    request(`/drivers/${id}/resume`, { method: "POST", token, schema: z.any() }),

  /**
   * Reassigns a delivery to a different driver.
   */
  reassignDelivery: (token: string, id: string, driverId: string) =>
    request(`/deliveries/${id}/reassign`, {
      method: "POST",
      token,
      body: { driverId },
      schema: z.any(),
    }),

  /**
   * Marks a delivery as complete.
   */
  completeDelivery: (token: string, id: string) =>
    request(`/deliveries/${id}/complete`, {
      method: "POST",
      token,
      schema: z.any(),
    }),
};
