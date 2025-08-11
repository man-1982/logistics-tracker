import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { selectToken } from "../../store/authSlice";
import type { Delivery } from "../../lib/api";
// import type { Driver } from "../../lib/api";

type DeliveriesData = { items: Delivery[] };
//type DriversData = { items: Driver[] };
type SortKey = "status" | "eta" | "name";
type SortDir = "asc" | "desc";

export default function DeliveriesTable() {
  const token = useAppSelector(selectToken);
  const qc = useQueryClient();

  if (!token) return null;

  const qDeliveries = useQuery({
    queryKey: ["deliveries"],
    enabled: !!token,
    queryFn: () => api.listDeliveries(token!),
  });

  const qDrivers = useQuery({
    queryKey: ["drivers"],
    enabled: !!token,
    queryFn: () => api.listDrivers(token!),
    staleTime: 300_000,
  });

  const deliveries = qDeliveries?.data?.items ?? [];
  const drivers = qDrivers?.data?.items ?? [];

  const [status, setStatus] = useState<"" | Delivery["deliveryStatus"]>("");
  const [name, setName] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("eta");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const reassign = useMutation({
    mutationFn: ({ deliveryId, driverId }: { deliveryId: string; driverId: string }) =>
      api.reassignDelivery(token!, deliveryId, driverId),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["deliveries"] });
      const prev = qc.getQueryData<DeliveriesData>(["deliveries"]);
      qc.setQueryData<DeliveriesData>(["deliveries"], (old) => ({
        items: (old?.items ?? []).map((d) =>
          d.id === vars.deliveryId
            ? { ...d, driverId: vars.driverId, status: d.deliveryStatus === "completed" ? "completed" : "assigned" }
            : d
        ),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deliveries"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["deliveries"] }),
  });

  // "Mark Completed"
  const complete = useMutation({
    // (optional) gives this mutation a stable identity in DevTools
    mutationKey: ["deliveries", "complete"],
    // The actual write. Throw on non-OK → onError path.
    mutationFn: async ({ deliveryId }: { deliveryId: string }) => {
      return api.completeDelivery(token!, deliveryId); // POST /complete
    },
    // Optimistic UI step (runs BEFORE the request goes out)
    // 1) cancel in-flight refetches for the affected query
    // 2) snapshot previous cache (return it for rollback)
    // 3) patch the cache to look "completed" now
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["deliveries"] });
      const prev = qc.getQueryData<DeliveriesData>(["deliveries"]);
      qc.setQueryData<DeliveriesData>(["deliveries"], (old) => ({
        items: (old?.items ?? []).map((d) =>
          d.id === vars.deliveryId ? { ...d, status: "completed", etaMinutes: 0 } : d
        ),
      }));
      return { prev }; // ⬅️ becomes ctx in onError/onSettled
    },
    // On Server rejected => Roll back to snapshot
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deliveries"], ctx.prev);
    },
    // either way, ensure cache is in sync with server
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
    // (Optional) tune behavior
    retry: 1,               // retry once on network error
    networkMode: "online",  // don’t queue offline
  });

  const filteredSorted = useMemo(() => {
    let out = deliveries;
    if (status) out = out.filter((d) => d.deliveryStatus === status);
    if (name.trim()) {
      const q = name.trim().toLowerCase();
      out = out.filter(
        (d) => d.title.toLowerCase().includes(q) || d.customer.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return a.deliveryStatus.localeCompare(b.deliveryStatus) * dir;
        case "name":
          return a.title.localeCompare(b.title) * dir;
        case "eta":
        default:
          return (a.etaMinutes - b.etaMinutes) * dir;
      }
    });
    return out;
  }, [deliveries, status, name, sortKey, sortDir]);


  if (qDeliveries.isLoading || qDrivers.isLoading) return <p>Loading deliveries…</p>;
  if (qDeliveries.isError) return <p role="alert">Error: {(qDeliveries.error as Error).message}</p>;
  if (qDrivers.isError) return <p role="alert">Error: {(qDrivers.error as Error).message}</p>;


  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Deliveries ({filteredSorted.length})</h3>

      <div className="flex flex-wrap gap-2">
        <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_transit">In transit</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          className="border rounded px-2 py-1"
          placeholder="Search by name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select className="border rounded px-2 py-1" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="eta">Sort by ETA</option>
          <option value="status">Sort by status</option>
          <option value="name">Sort by name</option>
        </select>

        <select className="border rounded px-2 py-1" value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)}>
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>

      <div className="overflow-scroll w-full rounded border bg-white">
        <table className="w-full text-left ">
          <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Title</th>
            <th className="p-2">Customer</th>
            <th className="p-2">ETA (min)</th>
            <th className="p-2">Status</th>
            <th className="p-2">Driver</th>
            <th className="p-2">Actions</th>
          </tr>
          </thead>
          <tbody>
          {filteredSorted.map((d) => {
            const current = drivers.find((dr) => dr.id === d.driverId) || null;
            return (
              <tr key={d.id} className="border-t">
                <td className="p-2">{d.title}</td>
                <td className="p-2">{d.customer}</td>
                <td className="p-2">{d.etaMinutes}</td>
                <td className="p-2">{d.deliveryStatus}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={current?.id ?? ""}
                    onChange={(e) => {
                      const driverId = e.target.value;
                      if (driverId) reassign.mutate({ deliveryId: d.id, driverId });
                    }}
                  >
                    <option value="">{current ? `${current.name}` : "Unassigned"}</option>
                    {drivers.map((dr) => (
                      <option key={dr.id} value={dr.id}>
                        {dr.name} ({dr.status})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-900 text-white disabled:opacity-50"
                    disabled={complete.isPending || d.deliveryStatus === "completed"}
                    onClick={() => complete.mutate({ deliveryId: d.id })}
                  >
                    Mark Completed
                  </button>
                </td>
              </tr>
            );
          })}
          {filteredSorted.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No deliveries match your filters.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
