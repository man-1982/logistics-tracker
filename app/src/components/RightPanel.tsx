import { useEffect, useState } from "react";
import DeliveriesTable from "../features/deliveries/DeliveriesTable.tsx";
import DriversList from "../features/drivers/DriversList.tsx";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RightPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<"deliveries" | "drivers">("deliveries");

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Overlay on small screens */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Panel */}
      <aside
        id="right-panel"
        aria-label="Side Panel"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 w-[360px] sm:w-[400px] bg-white shadow-xl border-l
                    transition-transform will-change-transform
                    ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-sm ${
                tab === "deliveries" ? "bg-white shadow border" : "text-gray-600"
              }`}
              onClick={() => setTab("deliveries")}
              aria-pressed={tab === "deliveries"}
            >
              Deliveries
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-sm ${
                tab === "drivers" ? "bg-white shadow border" : "text-gray-600"
              }`}
              onClick={() => setTab("drivers")}
              aria-pressed={tab === "drivers"}
            >
              Drivers
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md px-2 py-1 text-sm bg-gray-900 text-white"
          >
            Close
          </button>
        </div>

        {/* Body (keep both mounted; hide with CSS for stability) */}
        <div className="h-full overflow-y-auto">
          <div className={tab === "deliveries" ? "" : "hidden"} aria-hidden={tab !== "deliveries"}>
            <div className="p-3">
              <DriversList />
            </div>
          </div>
          <div className={tab === "drivers" ? "" : "hidden"} aria-hidden={tab !== "drivers"}>
            <div className="p-3">
              <DeliveriesTable />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
