// frontend/src/components/MapView.tsx
import { useEffect, useRef, type MutableRefObject } from "react";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import type { Category, MapSettings, Poi } from "../types/api";
import { categoryColorExpression } from "../map/colorExpression";
import { toFeatureCollection } from "../map/featureCollection";
import { resolveMapStyle } from "../map/style";

interface Props {
  pois: Poi[];
  categories: Category[];
  settings: MapSettings;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onMapClick: (lng: number, lat: number) => void;
  addMode: boolean;
  visitedPoiIds: Set<number>;
  mapRef: MutableRefObject<MlMap | null>;
}

const VISITED_RING_COLOR = "#4f46e5";

function addPoiLayers(map: MlMap, color: ReturnType<typeof categoryColorExpression>, selectedId: number | null) {
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "pois",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#ffffff",
      "circle-stroke-color": "#1a1a1a",
      "circle-stroke-width": 1.5,
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "pois",
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 13 },
    paint: { "text-color": "#1a1a1a" },
  });
  // Visited halo: a larger filled circle drawn behind the dot, so visited
  // places read as a colored ring at a glance.
  map.addLayer({
    id: "poi-visited",
    type: "circle",
    source: "pois",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "visited"], true]],
    paint: { "circle-color": VISITED_RING_COLOR, "circle-radius": 11, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
  });
  map.addLayer({
    id: "unclustered",
    type: "circle",
    source: "pois",
    filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": color as never, "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
  });
  map.addLayer({
    id: "poi-selected",
    type: "circle",
    source: "pois",
    filter: ["==", ["get", "id"], selectedId ?? -1],
    paint: { "circle-color": color as never, "circle-radius": 11, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
  });
}

export default function MapView({ pois, categories, settings, selectedId, onSelect, onMapClick, addMode, visitedPoiIds, mapRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep latest callbacks/flags in refs so the load handler closure stays current.
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  const addModeRef = useRef(addMode);
  const visitedRef = useRef(visitedPoiIds);
  onSelectRef.current = onSelect;
  onMapClickRef.current = onMapClick;
  addModeRef.current = addMode;
  visitedRef.current = visitedPoiIds;

  // Init once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveMapStyle(settings),
      center: [settings.default_map_center_lng, settings.default_map_center_lat],
      zoom: settings.default_map_zoom,
      // attributionControl defaults to showing; maplibre-gl v4 types accept
      // false | AttributionControlOptions, not true — so we omit it here.
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("pois", {
        type: "geojson",
        data: toFeatureCollection(pois, visitedRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });
      addPoiLayers(map, categoryColorExpression(categories), selectedId);
    });

    map.on("click", "unclustered", (e) => {
      const f = e.features?.[0];
      if (f) onSelectRef.current(Number((f.properties as { id: number }).id));
    });
    map.on("click", "clusters", (e) => {
      const f = e.features?.[0];
      const clusterId = f?.properties?.cluster_id;
      const src = map.getSource("pois") as GeoJSONSource | undefined;
      if (clusterId == null || !src) return;
      void src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = f!.geometry as unknown as { coordinates: [number, number] };
        map.easeTo({ center: geom.coordinates, zoom });
      });
    });
    map.on("click", (e) => {
      if (addModeRef.current) onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    // The map lives in a flex sibling of the 480px→0 collapsing sidebar; when
    // that animates, the container resizes and MapLibre must repaint to fill it.
    // The reference uses the same ResizeObserver approach.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update source data when filtered pois or my-visited set change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("pois") as GeoJSONSource | undefined;
    if (src) src.setData(toFeatureCollection(pois, visitedPoiIds));
  }, [pois, visitedPoiIds, mapRef]);

  // Update selection ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("poi-selected")) return;
    map.setFilter("poi-selected", ["==", ["get", "id"], selectedId ?? -1]);
  }, [selectedId, mapRef]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
