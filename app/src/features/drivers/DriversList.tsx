import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { selectToken } from "../../store/authSlice";

export default function DriversList() {
  
  /**
   * Authentication token from the Redux store.
   * `useAppSelector` is a pre-typed version of the `useSelector` hook from `react-redux`.
   * It extracts the `token` value from the `auth` slice of the state.
   */
  const token = useAppSelector(selectToken);

  /**
   * A React Query hook to fetch the list of drivers.
   * The non-null assertion `token!` is safe because the `enabled` option ensures `queryFn` is only called when `token` is truthy.
   */
  const q = useQuery({
    queryKey: ["drivers"],
    enabled: !!token,                         // don't fetch until logged in
    queryFn: () => api.listDrivers(token!),
  });

  if (!token) return null;
  if (q.isLoading) return <p>Loading drivers…</p>;
  if (q.isError) return <p role="alert">Error: {(q.error as Error).message}</p>;

  const items = q.data?.items ?? [];

  return (
    <div>
      <h3 className="text-lg font-medium">Drivers ({items.length})</h3>
      <ul className="list-disc pl-5">
        {items.map((d) => (
          <li key={d.id}>
            {d.name} — <strong>{d.status}</strong> {d.vehicle ? `(${d.vehicle})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
