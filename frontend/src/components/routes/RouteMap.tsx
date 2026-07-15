import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import type { Category, MapSettings, Poi, RouteLeg, RouteNode, RouteNodeKind } from "../../types/api";
import { resolveMapStyle } from "../../map/style";
import { routeLine } from "../../map/routeLine";
import { toFeatureCollection } from "../../map/featureCollection";
import { categoryColorExpression } from "../../map/colorExpression";

const LINE_COLOR = "#4f46e5";

function fitToNodes(map: MlMap, nodes: RouteNode[]) {
  if (nodes.length === 0) return;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const n of nodes) {
    minLng = Math.min(minLng, n.lng);
    minLat = Math.min(minLat, n.lat);
    maxLng = Math.max(maxLng, n.lng);
    maxLat = Math.max(maxLat, n.lat);
  }
  if (nodes.length === 1) {
    map.easeTo({ center: [nodes[0].lng, nodes[0].lat], zoom: Math.max(map.getZoom(), 11) });
  } else {
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 13, duration: 500 });
  }
}

// Nearby saved POIs: small category-colored dots, clustered at low zoom. Added
// BEFORE the route layers so the numbered route markers always sit on top.
function addPoiLayers(map: MlMap, color: ReturnType<typeof categoryColorExpression>) {
  map.addLayer({
    id: "route-poi-clusters",
    type: "circle",
    source: "route-pois",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#ffffff",
      "circle-stroke-color": "#1a1a1a",
      "circle-stroke-width": 1.5,
      "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
    },
  });
  map.addLayer({
    id: "route-poi-cluster-count",
    type: "symbol",
    source: "route-pois",
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 12 },
    paint: { "text-color": "#1a1a1a" },
  });
  map.addLayer({
    id: "route-poi-unclustered",
    type: "circle",
    source: "route-pois",
    filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": color as never, "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
  });
}

function addRouteLayers(map: MlMap) {
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": LINE_COLOR, "line-width": 3, "line-opacity": 0.85 },
  });
  // Stays get a filled indigo dot; stops a hollow one, both numbered by order.
  map.addLayer({
    id: "route-points",
    type: "circle",
    source: "route-points",
    paint: {
      "circle-radius": 12,
      "circle-color": ["case", ["==", ["get", "kind"], "stay"], LINE_COLOR, "#ffffff"],
      "circle-stroke-color": LINE_COLOR,
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "route-point-labels",
    type: "symbol",
    source: "route-points",
    layout: {
      "text-field": ["to-string", ["+", ["get", "order"], 1]],
      "text-font": ["Open Sans Bold"],
      "text-size": 12,
    },
    paint: { "text-color": ["case", ["==", ["get", "kind"], "stay"], "#ffffff", LINE_COLOR] },
  });
}

// A popup on a nearby POI: name, address, and (when the route is editable)
// buttons that add it as a stay or stop.
function openPoiPopup(
  map: MlMap,
  poi: Poi,
  canAdd: boolean,
  onAddNode: (poiId: number, kind: RouteNodeKind) => void,
) {
  const el = document.createElement("div");
  el.style.fontFamily = "system-ui, sans-serif";
  el.style.minWidth = "150px";

  const name = document.createElement("div");
  name.textContent = poi.name;
  name.style.cssText = "font-weight:700;font-size:13px;color:#111827;";
  el.appendChild(name);

  if (poi.address) {
    const addr = document.createElement("div");
    addr.textContent = poi.address;
    addr.style.cssText = "font-size:11.5px;color:#6b7280;margin-top:2px;";
    el.appendChild(addr);
  }

  const popup = new maplibregl.Popup({ closeButton: true, offset: 12 })
    .setLngLat([poi.lng, poi.lat])
    .setDOMContent(el)
    .addTo(map);

  if (canAdd) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    const mkBtn = (label: string, kind: RouteNodeKind) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "flex:1;padding:4px 8px;border-radius:6px;border:1px solid #4f46e5;background:#4f46e5;color:#fff;font-size:12px;cursor:pointer;";
      b.addEventListener("click", () => { onAddNode(poi.id, kind); popup.remove(); });
      return b;
    };
    row.appendChild(mkBtn("+ Stay", "stay"));
    row.appendChild(mkBtn("+ Stop", "stop"));
    el.appendChild(row);
  }
}

export default function RouteMap({ nodes, legs, pois, categories, settings, canAdd, onAddNode }: {
  nodes: RouteNode[];
  legs: RouteLeg[];
  pois: Poi[];
  categories: Category[];
  settings: MapSettings;
  canAdd: boolean;
  onAddNode: (poiId: number, kind: RouteNodeKind) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  // Latest values for the once-only load handler's closure (queries resolve
  // asynchronously and may land before or after "load").
  const nodesRef = useRef(nodes);
  const legsRef = useRef(legs);
  const poisRef = useRef(pois);
  const categoriesRef = useRef(categories);
  const canAddRef = useRef(canAdd);
  const onAddNodeRef = useRef(onAddNode);
  nodesRef.current = nodes;
  legsRef.current = legs;
  poisRef.current = pois;
  categoriesRef.current = categories;
  canAddRef.current = canAdd;
  onAddNodeRef.current = onAddNode;

  // Init once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveMapStyle(settings),
      center: [settings.default_map_center_lng, settings.default_map_center_lat],
      zoom: settings.default_map_zoom,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("route-pois", {
        type: "geojson",
        data: toFeatureCollection(poisRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });
      addPoiLayers(map, categoryColorExpression(categoriesRef.current));

      const { line, points } = routeLine(nodesRef.current, legsRef.current);
      map.addSource("route-line", { type: "geojson", data: line ?? { type: "FeatureCollection", features: [] } });
      map.addSource("route-points", { type: "geojson", data: points });
      addRouteLayers(map);
      fitToNodes(map, nodesRef.current);
    });

    map.on("click", "route-poi-clusters", (e) => {
      const f = e.features?.[0];
      const clusterId = f?.properties?.cluster_id;
      const src = map.getSource("route-pois") as GeoJSONSource | undefined;
      if (clusterId == null || !src) return;
      void src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = f!.geometry as unknown as { coordinates: [number, number] };
        map.easeTo({ center: geom.coordinates, zoom });
      });
    });

    map.on("click", "route-poi-unclustered", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = Number((f.properties as { id: number }).id);
      const poi = poisRef.current.find((p) => p.id === id);
      if (poi) openPoiPopup(map, poi, canAddRef.current, onAddNodeRef.current);
    });

    for (const layer of ["route-poi-unclustered", "route-poi-clusters"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the route when the node chain or leg geometry changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const lineSrc = map.getSource("route-line") as GeoJSONSource | undefined;
    const pointSrc = map.getSource("route-points") as GeoJSONSource | undefined;
    if (!lineSrc || !pointSrc) return;
    const { line, points } = routeLine(nodes, legs);
    lineSrc.setData(line ?? { type: "FeatureCollection", features: [] });
    pointSrc.setData(points);
    fitToNodes(map, nodes);
  }, [nodes, legs]);

  // Update the nearby-POI dots when the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource("route-pois") as GeoJSONSource | undefined;
    if (src) src.setData(toFeatureCollection(pois));
  }, [pois]);

  // Recolor the dots if categories change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("route-poi-unclustered")) return;
    map.setPaintProperty("route-poi-unclustered", "circle-color", categoryColorExpression(categories) as never);
  }, [categories]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
