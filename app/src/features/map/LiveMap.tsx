import { useEffect, useMemo, useRef } from "react";
import mapboxgl, { Map, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "../../store";
import { CONFIG } from "../../lib/config";

type Feature = {
  type: "Feature";
  id: string;
  properties: { driverId: string };
  geometry: { type: "Point"; coordinates: [number, number] };
};
type FC = { type: "FeatureCollection"; features: Feature[] };

export default function LiveMap() {
  const positions = useAppSelector((s) => s.telemetry);

  // Define our point on the map
  const data: FC = useMemo(() => {
    const features: Feature[] = Object.entries(positions).map(([driverId, p]) => ({
      type: "Feature",
      id: driverId,
      properties: { driverId },
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
      center: [-123.1207, 49.2827], // Vancouver default
      zoom: 9,
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
          "circle-color": "#2563eb",
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

      // Individual points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "drivers",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-color": "#10b981",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#064e3b",
        },
      });

      // Click cluster to zoom
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
        const f = e.features?.[0];
        if (!f) return;
        const { driverId } = f.properties as any;
        const [lng, lat] = (f.geometry as any).coordinates;
        new mapboxgl.Popup({ offset: 8 })
          .setLngLat([lng, lat])
          .setHTML(`<strong>Driver:</strong> ${driverId}`)
          .addTo(map);
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
  }, []);

  // update data & fit bounds on first points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("drivers") as GeoJSONSource | undefined;
    if (!src) return;
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

  return <div ref={mapContainerRef} className="h-[480px] w-full rounded-xl overflow-hidden shadow bg-white" />;
}
