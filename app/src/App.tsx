import { useEffect, useRef, useState } from "react";
import LoginForm from "./features/auth/LoginForm";
import DriversList from "./features/drivers/DriversList";
import { useAppSelector } from "./store";
import { selectToken } from "./store/authSlice";
import { connectWs, type WsEnvelope } from "./lib/ws";

export default function App() {
  const token = useAppSelector(selectToken);
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }
    const ws = connectWs((msg: WsEnvelope) => {
      if (msg.type === "gps" || msg.type === "hello") {
        setLog((l) => [JSON.stringify(msg), ...l].slice(0, 5));
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [token]);

  if (!token) return <LoginForm/>;

  return (
    <div className="grid gap-4 p-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <DriversList/>
      <section>
        <h3 className="text-lg font-medium">WS last messages</h3>
        <pre className="max-h-52 overflow-auto bg-gray-100 p-2 rounded">{log.join("\n")}</pre>
      </section>
    </div>
  );
}
