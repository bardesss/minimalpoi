import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import type { MapSettings, RouteNode } from "../../types/api";
import { resolveMapStyle } from "../../map/style";
import { routeLine } from "../../map/routeLine";

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

export default function RouteMap({ nodes, settings }: { nodes: RouteNode[]; settings: MapSettings }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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
      const { line, points } = routeLine(nodesRef.current);
      map.addSource("route-line", { type: "geojson", data: line ?? { type: "FeatureCollection", features: [] } });
      map.addSource("route-points", { type: "geojson", data: points });
      addRouteLayers(map);
      fitToNodes(map, nodesRef.current);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when the node chain changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const lineSrc = map.getSource("route-line") as GeoJSONSource | undefined;
    const pointSrc = map.getSource("route-points") as GeoJSONSource | undefined;
    if (!lineSrc || !pointSrc) return;
    const { line, points } = routeLine(nodes);
    lineSrc.setData(line ?? { type: "FeatureCollection", features: [] });
    pointSrc.setData(points);
    fitToNodes(map, nodes);
  }, [nodes]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
