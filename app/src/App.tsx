import { useEffect, useRef, useState } from "react";
import LoginForm from "./features/auth/LoginForm";
import DriversList from "./features/drivers/DriversList";
import {useAppDispatch, useAppSelector} from "./store";
import { selectToken } from "./store/authSlice";
import { connectWs } from "./lib/ws";
import {resetPositions, upsertPositonsBulk} from "./store/telemetrySlices";
import LiveMap from "./features/map/LiveMap.tsx";
import DeliveriesTable from "./features/deliveries/DeliveriesTable.tsx";
import RightPanel from "./components/RightPanel.tsx";

export default function App() {
  const token = useAppSelector(selectToken);
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

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

// Add right padding to main content on large screens when panel is open
  const mainPad = panelOpen ? "lg:pr-[380px]" : "";

  return (
    <div className={`relative grid gap-4 p-4 max-w-screen-3xl mx-auto ${mainPad}`}>
      {/* Toggle button (always visible) */}
      <div className="flex justify-end">
        <button
          type="button"
          aria-controls="right-panel"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
          className="rounded-md px-3 py-1.5 bg-cyan-700 text-white shadow"
          title={panelOpen ? "Hide side panel" : "Show side panel"}
        >
          {panelOpen ? "Hide Panel" : "Show Panel"}
        </button>
      </div>

      {/* Map stays as the primary content */}
      <LiveMap />

      {/* WS logs (unchanged) */}
      <section className="p-4 rounded-xl bg-white shadow">
        <details>
          <summary className="text-lg font-medium cursor-pointer text-cyan-800">
            Deliveries:
          </summary>
          <DeliveriesTable />
        </details>
      </section>
        <section className="p-4 rounded-xl bg-white shadow">
        <details>
          <summary className="text-lg font-medium cursor-pointer text-cyan-800">
            WS last messages (logs):
          </summary>
          <pre className="max-h-52 overflow-auto bg-gray-100 p-2 rounded">{log.join("\n")}</pre>
        </details>
      </section>


      {/* Right side panel */}
      <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
