import { CONFIG } from "./config";

/**
 * Defines the structure of a WebSocket message envelope.
 */
export type WsEnvelope<TType extends string = string, TData = unknown> = {
  /** Message envelope version. */
  v: 1;
  /** The type of the message. */
  type: TType;
  /** ISO 8601 timestamp of when the message was sent. */
  ts: string;
  /** The message payload. */
  data: TData;
};

/**
 * Represents the data payload for a GPS ping message.
 */
export type GpsPing = { driverId: string; lat: number; lng: number };

/**
 * Establishes a WebSocket connection and sets up message handling.
 */
export function connectWs(onMsg: (msg: WsEnvelope) => void) {
  const ws = new WebSocket(CONFIG.wsUrl);
  ws.onopen = () => console.info("[WS] open", CONFIG.wsUrl);
  ws.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data as string) as WsEnvelope;
      onMsg(parsed);
    } catch (err) {
      console.warn("[WS] parse error", err);
    }
  };
  ws.onerror = (e) => console.warn("[WS] error", e);
  ws.onclose = () => console.info("[WS] closed");
  return ws;
}
