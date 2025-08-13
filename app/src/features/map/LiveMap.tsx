import {useEffect, useMemo, useRef, useState} from "react";
import mapboxgl, {Map, GeoJSONSource, type LngLatLike} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector, useAppDispatch } from "../../store";
import { CONFIG } from "../../lib/config";
import { setSelectedDriver, selectSelectedDriverId } from "../../store/uiSlice";
import { useQuery } from "@tanstack/react-query";
import { selectToken } from "../../store/authSlice";
import { api, type MachineStatus } from "../../lib/api";

//TODO move to lib
type Feature = {
  type: "Feature";
  id: string;
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
  // always fresh positions
  const positionsRef = useRef(positions);
  const activeDriverRef = useRef<string | null>(null);
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const fittedOnceRef = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const selectedFeatureRef = useRef< FeatureSelector | GeoJSONFeature | TargetFeature | null>(null);
  // TODO use from redux
  const [selectedFeature, setSelectedFeature] = useState(null);


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
      }
    }
    return map;
  }, [qDrivers.data]);

  const statusById = useMemo(() => {
    const items = qDrivers.data?.items ?? [];
    const map: Record<string, string> = {};
    for (const d of items) {
      if (d.status) {
        map[d.id] = d.status;
      }
    }
    return map;
  }, [qDrivers.data]);

  /**
   * Create or update popup with driver info
   */
  const createOrUpdatePopup = (driverId: string, coordinates: LngLatLike, isNew:boolean = false) => {
    // some kind of hack if we close popup windows manualy
    // and would like to prevent creating a new popup
    if(!popupRef.current && !isNew){
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    const drivers = qDrivers.data;
    const meta = drivers?.items.find((d) => d.id === driverId);
    const pos = positionsRef.current[driverId];
    const last = pos?.ts ? new Date(pos.ts).toLocaleTimeString() : "—";
    const driverStatus = meta?.status ? DRIVER_STATUS_LABEL[meta.status as keyof typeof DRIVER_STATUS_LABEL] : "-";

    const html = `
      <div class="text-sm leading-tight font-sans rounded-2xl">
        <div><strong class="font-bold">${meta?.name ?? driverId}</strong>${meta?.vehicle ? ` • ${meta.vehicle}` : ""}</div>
        <div><span class="font-medium">Status:</span> ${driverStatus}</div>
        <div><span class="font-medium">Last update:</span> ${last}</div>
      </div>
    `;

    if (!popupRef.current && isNew) {
      popupRef.current = new mapboxgl.Popup({
        offset: 0,
        closeButton: true,
        closeOnClick: true,
      }).addTo(map).on("close", (e) => {
        console.log("popup closed", e);
        // clean up ref after close
        // This is needed to prevent popup appear after driver position was changed
        popupRef.current = null;
      });
    }
    if(popupRef.current){
      popupRef.current
        .setLngLat(coordinates)
        .setHTML(html);
    }

  };

  /*************************************
   *
   * Initial map setup and event handlers
   * on mount everything is initialized
   *
   ************************************/
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = CONFIG.mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-52.7100, 47.5600],
      zoom: 2,
    });
    mapRef.current = map;

    const mapOnLoad = () => {
      map.addSource("drivers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as FC,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        // it's need for feature
        // @see https://docs.mapbox.com/style-spec/reference/types/#promoteId
        promoteId: "driverId",
      });

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
            "paused",     "#ecd23a",
            "idle",       "#6b7280",
            "alarm",      "#ef4444",
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

      map.addLayer({
        id: "selected-point",
        type: "circle",
        source: "drivers",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "driverId"], "__none__"]],
        paint: {
          "circle-radius": 11,
          "circle-color": [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            'rgba(248,157,6,0.98)',      // Highlight color
            '#4264fb'    // Default color
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#b45309"
        },
      });

      map.addLayer({
        id: "point-labels",
        type: "symbol",
        source: "drivers",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "symbol-z-order": "source",
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-halo-blur": 1
        }
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] }) as
          mapboxgl.MapboxGeoJSONFeature[];
        const first = features[0];
        if (!first) return;

        const clusterId = (first.properties as any)?.cluster_id as number | undefined;
        if (typeof clusterId !== "number") return;

        const src = map.getSource("drivers") as GeoJSONSource | undefined;
        if (!src) return;

        src.getClusterExpansionZoom(clusterId, (err, newZoom) => {
          if (err) return;

          const coords = (first.geometry as any).coordinates as [number, number];
          if (newZoom === null) return;
          map.easeTo({ center: coords, zoom: newZoom });
        });
      });

      // Click on Drivers icon
      map.addInteraction('click-unclustered-point', {
        type: 'click',
        target: { layerId: 'unclustered-point' },
        handler: (e) => {
          const f = e.feature;
          if (!f) return;

          const { driverId } = f.properties as object;
          const coordinates = (f.geometry as any).coordinates as [number, number];

          dispatch(setSelectedDriver(driverId));
          activeDriverRef.current = driverId;

          const currentZoom = map.getZoom();
          const targetZoom = currentZoom < 12 ? 12 : currentZoom;
          map.easeTo({ center: coordinates, zoom: targetZoom, duration: 450 });
          // just init on click event
          createOrUpdatePopup(driverId, coordinates, true);
        }
      });


      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
    };

    map.on("load", mapOnLoad);

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      map.remove();
      map.off("load", mapOnLoad);
      mapRef.current = null;
    };
  }, [CONFIG.mapboxToken]);

  // Update positions reference
  useEffect(() => {

  }, [positions]);


  /*****************************
   *
   * Update Drivers positions on map
   *
   *****************************/
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const driverSourcePoints = map.getSource("drivers") as GeoJSONSource | undefined;
    if (!driverSourcePoints) return;

    // list of driver points => features
    const features: Feature[] = Object.entries(positions).map(([driverId, p]) => ({
      type: "Feature",
      id: driverId,
      properties: {
        driverId: driverId,
        label: vehicleById?.[driverId] ?? driverId,
        status: statusById?.[driverId] ?? "idle"
      },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));

    const data: FC = { type: "FeatureCollection", features };
    driverSourcePoints.setData(data);

    if (!fittedOnceRef.current && features.length > 0) {
      const coords = features.map((f) => f.geometry.coordinates);
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const bounds = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
      ] as [[number, number], [number, number]];

      if (isFinite(bounds[0][0]) && isFinite(bounds[0][1]) &&
        isFinite(bounds[1][0]) && isFinite(bounds[1][1])) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
        fittedOnceRef.current = true;
      }
    }

    positionsRef.current = positions;

  }, [positions]);

  // Update selected point filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const filter = ["all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "driverId"], selectedId ?? "__none__"]
    ] as any;

    if (map.getLayer("selected-point")) {
      map.setFilter("selected-point", filter);
    }

    // Update active driver reference
    activeDriverRef.current = selectedId;

    // Update or create popup for selected driver
    if (selectedId && positions[selectedId]) {
      const pos = positions[selectedId];

      // better weat yo use lon and lat implementation
      const coordinates: LngLatLike = {'lon': pos.lng, 'lat': pos.lat};
      createOrUpdatePopup(selectedId, coordinates);

      const targetZoom = Math.max(12, map.getZoom());
      map.easeTo({ center: coordinates, zoom: targetZoom, duration: 400 });
    }
  }, [selectedId, positions]);

  // Sync selectedFeature with State
  // this is much better than using selectedFeatureRef.current
  useEffect(() => {
    selectedFeatureRef.current = selectedFeature;
  }, [selectedFeature]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[560px] w-full rounded-xl overflow-hidden shadow bg-white"
    />
  );
}
