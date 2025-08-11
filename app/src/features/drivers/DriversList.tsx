// app/src/features/drivers/DriversList.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAppDispatch, useAppSelector } from "../../store";
import { selectToken } from "../../store/authSlice";
import { setSelectedDriver } from "../../store/uiSlice";
import type { Driver, MachineStatus } from "../../lib/api";

type DriversListData = { items: Driver[] };

const STATUS_BADGE: Record<MachineStatus, string> = {
  delivering: "inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800",
  paused:     "inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800",
  idle:       "inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800",
  alarm:      "inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800",
};

export default function DriversList() {
  const token = useAppSelector(selectToken);
  const dispatch = useAppDispatch();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["drivers"],
    enabled: !!token,
    queryFn: () => api.listDrivers(token!),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "paused" | "idle" }) =>
      next === "paused" ? api.pauseDriver(token!, id) : api.resumeDriver(token!, id),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["drivers"] });
      const prev = qc.getQueryData<DriversListData>(["drivers"]);
      qc.setQueryData<DriversListData>(["drivers"], (old) => ({
        items: (old?.items ?? []).map((d) => (d.id === vars.id ? { ...d, status: vars.next } : d)),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["drivers"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });

  if (!token) return null;
  if (q.isLoading) return <p className="text-lg font-medium">Loading drivers…</p>;
  if (q.isError) return <p role="alert">Error: {(q.error as Error).message}</p>;

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Drivers ({items.length})</h3>
      <ul className="divide-y rounded border bg-white">
        {items.map((d) => {
          const isPaused = d.status === "paused";
          const next: "paused" | "idle" = isPaused ? "idle" : "paused";
          return (
            <li key={d.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                {/* Clickable name -> center on map */}
                <button
                  className="font-medium underline-offset-2 hover:underline"
                  onClick={() => dispatch(setSelectedDriver(d.id))}
                  title="Locate on map"
                >
                  {d.name}
                </button>
                <span className={STATUS_BADGE[d.status]}>{d.status}</span>
                {d.vehicle && <span className="text-sm text-gray-600">({d.vehicle})</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* Explicit Locate button too (optional but handy) */}
                <button
                  className="px-2 py-1 rounded border text-sm"
                  onClick={() => dispatch(setSelectedDriver(d.id))}
                  title="Locate on map"
                >
                  Locate
                </button>
                <button
                  className="px-3 py-1 rounded bg-gray-900 text-white disabled:opacity-50"
                  disabled={toggleStatus.isPending || d.status === "delivering" || d.status === "alarm"}
                  onClick={() => toggleStatus.mutate({ id: d.id, next })}
                  title={
                    d.status === "delivering" || d.status === "alarm"
                      ? "Status controlled by server"
                      : isPaused ? "Resume (set to idle)" : "Pause (set to paused)"
                  }
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-500">
        Click a driver’s name or <b>Locate</b> to center the map and open their popup.
      </p>
    </div>
  );
}
