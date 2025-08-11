import { useEffect, useRef, useState } from "react";
import LoginForm from "./features/auth/LoginForm";
import DriversList from "./features/drivers/DriversList";
import {useAppDispatch, useAppSelector} from "./store";
import { selectToken } from "./store/authSlice";
import { connectWs } from "./lib/ws";
import {resetPositions, upsertPositonsBulk} from "./store/telemetrySlices";
import LiveMap from "./features/map/LiveMap.tsx";

export default function App() {
  const token = useAppSelector(selectToken);
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const d = useAppDispatch();

  useEffect(() => {
    if (!token) {
      // reset all and good day by now!
      d(resetPositions());
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Batch GPS pings per frame
    const pending = new Map<string, { lat: number; lng: number; ts: string }>();
    let rafId: number | null = null;
    const flush = () => {
      rafId = null;
      if (pending.size === 0) return;
      const batch = Array.from(pending.entries()).map(([driverId, p]) => ({
        driverId, pos: { lat: p.lat, lng: p.lng, ts: p.ts },
      }));
      pending.clear();
      d(upsertPositonsBulk(batch));
    };

    const ws = connectWs((msg) => {
      if (msg.type === "gps") {
        const p = msg.data as { driverId: string; lat: number; lng: number };
        pending.set(p.driverId, { ...p, ts: msg.ts });
        if (rafId == null) rafId = requestAnimationFrame(flush);
      }
      if (msg.type === "gps" || msg.type === "hello") {
        setLog((l) => [JSON.stringify(msg), ...l].slice(0, 5));
      }
    });

    wsRef.current = ws;
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      flush();
      ws.close();
    };
  }, [token, d]);

  if (!token) return <LoginForm/>;

  return (
    <div className="grid gap-4 p-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <DriversList/>
      <LiveMap/>
      <section>
        <h3 className="text-lg font-medium">WS last messages</h3>
        <pre className="max-h-52 overflow-auto bg-gray-100 p-2 rounded">{log.join("\n")}</pre>
      </section>
    </div>
  );
}
