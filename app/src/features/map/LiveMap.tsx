import { useEffect, useMemo, useRef } from "react";
import mapboxgl, { Map, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector, useAppDispatch } from "../../store";
import { CONFIG } from "../../lib/config";
import { setSelectedDriver, selectSelectedDriverId } from "../../store/uiSlice";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {selectToken} from "../../store/authSlice";
import {api, type MachineStatus} from "../../lib/api";

//TODO move to lib
type Feature = {
  type: "Feature";
  id: string;
  // TODO enhance with other driver informaition
  properties: { driverId: string, label: string, status?: string };
  geometry: { type: "Point"; coordinates: [number, number] };
};
type FC = { type: "FeatureCollection"; features: Feature[] };

export default function LiveMap() {
  const DRIVER_STATUS_LABEL: Record<MachineStatus, string> = {
    delivering: "Delivering",
    paused: "Paused",
    idle: "Idle",
    alarm: "Alarm",
  };

  const positions = useAppSelector((s) => s.telemetry);
  const selectedId = useAppSelector(selectSelectedDriverId);
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  // always fresh positions
  const positionsRef = useRef(positions);


  const token = useAppSelector(selectToken);
  const qDrivers = useQuery({
    queryKey: ["drivers"],
    enabled: !!token,
    queryFn: () => api.listDrivers(token!),
  });

  const vehicleById = useMemo(()=> {
    const items = qDrivers.data?.items ?? [];
    const map: Record<string, string> = {};
    for (const d of items) {
      if(d.vehicle){
        map[d.id] = d.vehicle;
        return map;
      }
    }
  }, [qDrivers.data]);

  const statusById = useMemo(() => {
    const items = qDrivers.data?.items ?? [];
    const map: Record<string, string> = {};
    for (const d of items) {
      if(d.status){
        map[d.id] = d.status;
      }
    }
    return map;
  }, [qDrivers.data]);

  // console.log("LiveMap", { positions, selectedId });
  // Define our point on the map
  const data: FC = useMemo(() => {
    const features: Feature[] = Object.entries(positions).map(([driverId, p]) => (
      {
      type: "Feature",
      id: driverId, 
      properties: {
        driverId: driverId,
        label: vehicleById?.[driverId] ?? driverId,
        status: statusById?.[driverId] ?? "idle"},
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));
    return { type: "FeatureCollection", features };
  }, [positions]);

  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const fittedOnceRef = useRef(false);

  //TODO consider possibility to use useQuery with select option
  //@see https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations

  // init once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = CONFIG.mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      // TDOO consider using a default position by curent user
      center: [-52.7100, 47.5600,], // st. john's
      zoom: 2,
    });
    mapRef.current = map;

    const mapOnLoad = () => {
      // add drivers source
      map.addSource("drivers", {
        type: "geojson",
        data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });


      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "drivers",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 18,
          "circle-color": "#25b0eb",
          "circle-opacity": 0.85,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "drivers",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      // TODO need generate const for colors and labels and ...
      // Individual points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "drivers",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "status"],
            "delivering", "#16a34a",
            "paused", "#ecd23a",
            "idle", "#6b7280",
            "alarm", "#ef4444",
            "#3b82f6"
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": [
            "match", ["get", "status"],
            "delivering", "#065f46",
            "paused",     "#ec6e08",
            "idle",       "#626265",
            "alarm",      "#991b1b",
            "#1e40af"
          ],
        },
      });

      // selected halo (filtered by driverId)
      map.addLayer({
        id: "selected-point",
        type: "circle",
        source: "drivers",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "driverId"], "__none__"]],
        paint: {
          "circle-radius": 11,
          "circle-color": "#F59E0B59",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#b45309"
        } });

      // labels (driverId for now; we can switch to names later)
      map.addLayer({
        id: "point-labels",
        type: "symbol",
        source: "drivers",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "label"],      // or a short label property if you add one
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-allow-overlap": true
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1
        }
      });


      // Click cluster -> zoom
      map.on("click", "clusters", (e) => {
        // get the clicked cluster feature
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] }) as
          mapboxgl.MapboxGeoJSONFeature[];
        const first = features[0];
        if (!first) return;

        // cluster_id => a number
        const clusterId = (first.properties as any)?.cluster_id as number | undefined;
        if (typeof clusterId !== "number") return;

        // 3) Retrieve the source 
        const src = map.getSource("drivers") as GeoJSONSource | undefined;
        if (!src) return;

        src.getClusterExpansionZoom(clusterId, (err, newZoom) => {
          // Handler error
          // TODO add error handling
          if (err ) return;

          // Extract coordinates
          const coords = (first.geometry as any).coordinates as [number, number];

          if (newZoom === null) return;
          // Now types are safe: zoom is number, center is LngLatLike
          map.easeTo({ center: coords, zoom: newZoom });
        });
      });

      // Click point → popup
      map.on("click", "unclustered-point", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const { driverId } = f.properties as any;
        dispatch(setSelectedDriver(driverId));

        // Lookup driver meta from React Query cache for tooltip
        const drivers = qc.getQueryData<{ items: Array<{ id: string; name: string; status: string }> }>(["drivers"]);
        const meta = drivers?.items.find((d) => d.id === driverId);
        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const pos = positionsRef.current[driverId];

        // TODO normalize the type
        const coords = (f.geometry as any).coordinates as [number, number];
        const currentZoom = map.getZoom();
        const targetZoom = currentZoom < 12 ? 12 : currentZoom;
        map.easeTo({ center: coords, zoom: targetZoom, duration:450});
        const driverStatus = meta?.status ? DRIVER_STATUS_LABEL[meta.status as keyof typeof DRIVER_STATUS_LABEL] : "-";

        // TODO add Auto-update without re-clicking
        const last = pos?.ts ? new Date(pos.ts).toLocaleTimeString() : "—";
        const html = `
          <div class="text-sm leading-tight font-sans pb-5 rounded-2xl">
            <div><strong class="font-bold">${meta?.name ?? driverId}</strong></div>
            <div><span class="font-medium">Status:</span> ${driverStatus}</div>
            <div><span class="font-medium">Last update:</span> ${last}</div>
          </div>
        `;
        new mapboxgl.Popup({ offset: 8 }).setLngLat([lng, lat]).setHTML(html).addTo(map);
      });

      // Cursor pointer
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
    };
    
    map.on("load", mapOnLoad);

    // Cleanup
    return () => {
      map.remove();
      map.off("load", mapOnLoad);
      mapRef.current = null;
    };
  }, [CONFIG.mapboxToken, ]);

  // update data & fit bounds on first points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("drivers") as GeoJSONSource | undefined;
    if (!src) return;

    // set data to points and map sources
    src.setData(data as any);

    if (!fittedOnceRef.current && data.features.length > 0) {
      const coords = data.features.map((f) => f.geometry.coordinates);
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const minX = Math.min(...lons), maxX = Math.max(...lons);
      const minY = Math.min(...lats), maxY = Math.max(...lats);

      /**
       * Checks if the calculated bounding box coordinates are finite numbers. This is a
       * safeguard against errors if the initial `data.features` array is empty, which
       * would cause `Math.min` and `Math.max` to return `Infinity` and `-Infinity`.
       * If the coordinates are valid, it adjusts the map's viewport to fit all driver
       * markers with a smooth animation. This is done only once when the first set of
       * markers is available, controlled by the `fittedOnceRef` flag, allowing the user
       * to freely pan and zoom afterward.
       */
      if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
        map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, maxZoom: 14, duration: 400 });
        fittedOnceRef.current = true;
      }
    }
  }, [data]);

  // UPDATE selected filter (no re-init)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const filter = ["all", ["!", ["has", "point_count"]], ["==", ["get", "driverId"], selectedId ?? "__none__"]] as any;
    if (map.getLayer("selected-point")) {
      map.setFilter("selected-point", filter);
    }
  }, [selectedId]);

  useEffect(() => { positionsRef.current = positions; }, [positions]);


  return <div ref={mapContainerRef} className="h-[560px] w-full rounded-xl overflow-hidden shadow bg-white" />;
}
