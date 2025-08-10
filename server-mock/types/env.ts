import {z} from 'zod';
import * as dotenv from 'dotenv';
// local env first
dotenv.config({path: '.env.local'});
// regular one after
dotenv.config();

const Env = z.object({
    PORT: z.coerce.number().int().positive(),
    WS_PORT: z.coerce.number().int().positive(),
    WS_PATH: z.string().startsWith('/'),
    CORS_ORIGINS: z.string().transform((s)=>s.split(',')
      .map(
        (x)=>x.trim()
      )
      .filter(Boolean)
    ),
    JWT_SECRET: z.string().min(10),
    ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive(),
    GPS_TICK_MS: z.coerce.number().int().positive()
});

export const ENV = Env.parse({
  PORT: process.env.PORT,
  WS_PORT: process.env.WS_PORT,
  WS_PATH: process.env.WS_PATH,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL_SEC: process.env.ACCESS_TOKEN_TTL_SEC,
  GPS_TICK_MS: process.env.GPS_TICK_MS,
});

