import { WebSocketServer } from "ws";
import { ENV } from "../types/env";
import { type WsEnvelope, type GpsPing } from "../types/api";

const driverCoords: Record<string, { lat: number; lng: number }> = {
  d1: { lat: 47.5600, lng: -52.7100},// St. John's, NL
  d2: {lat: 47.5615, lng: -52.7126}, // St. John's, NL
  d3: { lat: 47.5625, lng: -52.7130}, // St. John's, NL
  d5: { lat: 47.5625, lng: -52.7130}, // St. John's, NL
  d6: { lat: 47.5625, lng: -52.7130}, // St. John's, NL
  d8: { lat: 47.5625, lng: -52.7130}, // St. John's, NL
  d9: { lat: 47.5625, lng: -52.7130}, // St. John's, NL
};

const wss = new WebSocketServer({ port: ENV.WS_PORT, path: ENV.WS_PATH });
wss.on("connection", (ws) => {
  const hello: WsEnvelope<"hello", { msg: string }> = {
    v: 1,
    type: "hello",
    ts: new Date().toISOString(),
    data: { msg: "ws up" },
  };
  ws.send(JSON.stringify(hello));
});
console.log(`[WS] listening on :${ENV.WS_PORT}${ENV.WS_PATH}`);

// Random walk for each driver
setInterval(() => {
  for (const [driverId, pos] of Object.entries(driverCoords)) {
    const jitter = () => (Math.random() - 0.5) * 0.002;
    pos.lat += jitter();
    pos.lng += jitter();

    const ping: GpsPing = { driverId, lat: pos.lat, lng: pos.lng };

    const env = {
      v: 1,
      type: "gps",
      ts: new Date().toISOString(),
      data: ping,
    } satisfies WsEnvelope<"gps", GpsPing>;

    wss.clients.forEach((c) => {
      if (c.readyState === 1) c.send(JSON.stringify(env));
    });
  }
}, ENV.GPS_TICK_MS);
