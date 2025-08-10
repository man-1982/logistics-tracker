// app/src/lib/config.ts
import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_BASE: z.url(),
  VITE_WS_URL: z.url(),
  VITE_MAPBOX_TOKEN: z.string().min(1),
});

const parsed = EnvSchema.parse({
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  VITE_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
});

export const CONFIG = {
  apiBase: parsed.VITE_API_BASE,
  wsUrl: parsed.VITE_WS_URL,
  mapboxToken: parsed.VITE_MAPBOX_TOKEN,
} as const;
