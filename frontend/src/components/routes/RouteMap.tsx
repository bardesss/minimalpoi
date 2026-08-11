import { useEffect, useRef } from "react";
// maplibre-gl 6 dropped the default export; the namespace import replaces it.
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { Category, MapSettings, Poi, RouteLeg, RouteNode, RouteNodeKind } from "../../types/api";
import { MAP_FONT, resolveMapStyle } from "../../map/style";
import { routeLine } from "../../map/routeLine";
import { toFeatureCollection } from "../../map/featureCollection";
import { categoryColorExpression } from "../../map/colorExpression";
import { routeSignature } from "../../lib/routeSignature";
import { useIsMobile } from "../../lib/useMediaQuery";
import { buildPoiMiniCard } from "../PoiMiniCard";
import { theme } from "../../theme";

const LINE_COLOR = "#4f46e5";
const PASSED_COLOR = "#a8a39b"; // muted grey — de-emphasises days already travelled

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
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": MAP_FONT, "text-size": 12 },
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
    paint: {
      "line-color": ["case", ["get", "passed"], PASSED_COLOR, LINE_COLOR],
      "line-width": 3,
      "line-opacity": ["case", ["get", "passed"], 0.35, 0.85],
    },
  });
  // Stays get a filled indigo dot; stops a hollow one, both numbered by order.
  map.addLayer({
    id: "route-points",
    type: "circle",
    source: "route-points",
    paint: {
      "circle-radius": 12,
      "circle-color": ["case", ["get", "passed"], PASSED_COLOR, ["==", ["get", "kind"], "stay"], LINE_COLOR, "#ffffff"],
      "circle-stroke-color": ["case", ["get", "passed"], PASSED_COLOR, LINE_COLOR],
      "circle-stroke-width": 2,
      "circle-opacity": ["case", ["get", "passed"], 0.55, 1],
      "circle-stroke-opacity": ["case", ["get", "passed"], 0.55, 1],
    },
  });
  map.addLayer({
    id: "route-point-labels",
    type: "symbol",
    source: "route-points",
    filter: ["has", "seq"],  // middle nodes only; start/end get a glyph
    layout: {
      "text-field": ["to-string", ["get", "seq"]],
      "text-font": MAP_FONT,
      "text-size": 12,
    },
    paint: {
      "text-color": ["case", ["get", "passed"], "#ffffff", ["==", ["get", "kind"], "stay"], "#ffffff", LINE_COLOR],
      "text-opacity": ["case", ["get", "passed"], 0.75, 1],
    },
  });
  map.addLayer({
    id: "route-point-role",
    type: "symbol",
    source: "route-points",
    filter: ["has", "role"],
    layout: {
      "text-field": ["match", ["get", "role"], "start", "▶", "end", "■", ""],
      "text-font": MAP_FONT,
      "text-size": 13,
    },
    paint: { "text-color": "#ffffff" },
  });
}

export default function RouteMap({ nodes, legs, pois, categories, settings, canAdd, onAddNode, passedNodeIds, highlightNodeId, poiById, onOpenPoi }: {
  nodes: RouteNode[];
  legs: RouteLeg[];
  pois: Poi[];
  categories: Category[];
  settings: MapSettings;
  canAdd: boolean;
  onAddNode: (poiId: number, kind: RouteNodeKind) => void;
  passedNodeIds: Set<number>;
  highlightNodeId: number | null;
  poiById: Record<number, Poi>;
  onOpenPoi: (poiId: number) => void;
}) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  // Only re-fit the camera when the pins actually move — not on every refetch or
  // a teammate's live-sync edit, which yield new array identities with the same
  // coordinates (the camera-hijack fix).
  const lastFitSigRef = useRef<string>("");
  // Latest values for the once-only load handler's closure (queries resolve
  // asynchronously and may land before or after "load").
  const nodesRef = useRef(nodes);
  const legsRef = useRef(legs);
  const poisRef = useRef(pois);
  const categoriesRef = useRef(categories);
  const canAddRef = useRef(canAdd);
  const onAddNodeRef = useRef(onAddNode);
  const passedRef = useRef(passedNodeIds);
  const highlightRef = useRef(highlightNodeId);
  const isMobileRef = useRef(isMobile);
  const poiByIdRef = useRef(poiById);
  const onOpenPoiRef = useRef(onOpenPoi);
  // The itinerary-hover mini card (Task 4): a single reused popup instance,
  // shown/hidden as highlightNodeId changes.
  const hoverCardRef = useRef<maplibregl.Popup | null>(null);
  // The currently-open PINNED card (nearby dot or on-route pin click), if any.
  // A ref (not a plain closure variable) because both the once-only init
  // effect's click/hover handlers AND the separate highlightNodeId effect
  // need to read/suppress against it — only one card (pinned or transient) is
  // ever shown at a time. Nulled by each pinned popup's own "close" listener,
  // so it self-clears whether dismissed via the card's × button, a map click
  // (MapLibre's default closeOnClick), or closeOpenCards().
  const openPopupRef = useRef<maplibregl.Popup | null>(null);
  nodesRef.current = nodes;
  legsRef.current = legs;
  poisRef.current = pois;
  categoriesRef.current = categories;
  canAddRef.current = canAdd;
  onAddNodeRef.current = onAddNode;
  passedRef.current = passedNodeIds;
  highlightRef.current = highlightNodeId;
  isMobileRef.current = isMobile;
  poiByIdRef.current = poiById;
  onOpenPoiRef.current = onOpenPoi;

  // Plain category color for a POI (the mini card applies its own tint).
  const categoryColorFor = (poi: Poi) =>
    categoriesRef.current.find((c) => c.id === poi.category_id)?.color ?? theme.color.fallbackPin;

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
    map.addControl(
      new maplibregl.GeolocateControl({
        trackUserLocation: true,
        positionOptions: { enableHighAccuracy: true },
      }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("route-pois", {
        type: "geojson",
        data: toFeatureCollection(poisRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });
      addPoiLayers(map, categoryColorExpression(categoriesRef.current));

      const { line, points } = routeLine(nodesRef.current, legsRef.current, passedRef.current);
      map.addSource("route-line", { type: "geojson", data: line });
      map.addSource("route-points", { type: "geojson", data: points });
      addRouteLayers(map);
      map.addLayer({
        id: "route-point-highlight",
        type: "circle",
        source: "route-points",
        filter: ["==", ["get", "id"], highlightRef.current ?? -1],
        paint: {
          "circle-radius": 17,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#f59e0b",
          "circle-stroke-width": 3,
        },
      });
      fitToNodes(map, nodesRef.current);
      lastFitSigRef.current = routeSignature(nodesRef.current);
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

    // At most one pinned mini card open at a time — clicking a new dot/pin
    // closes whatever was open before (and any transient hover card).
    const closeOpenCards = () => {
      openPopupRef.current?.remove();
      openPopupRef.current = null;
      routePointHoverPopup.remove();
      hoverCardRef.current?.remove();
    };

    map.on("click", "route-poi-unclustered", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = Number((f.properties as { id: number }).id);
      const poi = poisRef.current.find((p) => p.id === id);
      if (!poi) return;
      closeOpenCards();
      const el = buildPoiMiniCard({
        poi, color: categoryColorFor(poi), pinned: true,
        onOpen: () => { onOpenPoiRef.current(poi.id); popup.remove(); },
        onClose: () => popup.remove(),
        onAdd: canAddRef.current ? (kind) => { onAddNodeRef.current(poi.id, kind); popup.remove(); } : undefined,
        bigTap: isMobileRef.current,
      });
      const popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: "220px" })
        .setLngLat([poi.lng, poi.lat])
        .setDOMContent(el)
        .addTo(map);
      // Self-clears the ref on ANY dismissal path (× button, closeOpenCards(),
      // or MapLibre's own closeOnClick) so hover suppression below can't stick.
      popup.on("close", () => { if (openPopupRef.current === popup) openPopupRef.current = null; });
      openPopupRef.current = popup;
    });

    // On-route pins: click opens a pinned card (Open only — it's already on the
    // route); hover shows a transient preview, mirroring MapView's pattern.
    const routePointHoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "220px" });

    map.on("click", "route-points", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = Number((f.properties as { id: number }).id);
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      closeOpenCards();
      const poi = node.poi_id != null ? poiByIdRef.current[node.poi_id] : undefined;
      const el = poi
        ? buildPoiMiniCard({
            poi, color: categoryColorFor(poi), pinned: true,
            onOpen: () => { onOpenPoiRef.current(poi.id); popup.remove(); },
            onClose: () => popup.remove(),
            bigTap: isMobileRef.current,
          })
        : buildPoiMiniCard({
            poi: { name: node.name, image_url: null, website: null } as unknown as Poi,
            color: theme.color.fallbackPin,
            pinned: true,
            onClose: () => popup.remove(),
            bigTap: isMobileRef.current,
          });
      const popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: "220px" })
        .setLngLat([node.lng, node.lat])
        .setDOMContent(el)
        .addTo(map);
      popup.on("close", () => { if (openPopupRef.current === popup) openPopupRef.current = null; });
      openPopupRef.current = popup;
    });

    // Transient hover preview — suppressed while a pinned card is open so the
    // two never show at once.
    map.on("mousemove", "route-points", (e) => {
      if (openPopupRef.current) return;
      const f = e.features?.[0];
      if (!f) return;
      const id = Number((f.properties as { id: number }).id);
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      const poi = node.poi_id != null ? poiByIdRef.current[node.poi_id] : undefined;
      const card = poi
        ? buildPoiMiniCard({ poi, color: categoryColorFor(poi), pinned: false })
        : buildPoiMiniCard({ poi: { name: node.name, image_url: null, website: null } as unknown as Poi, color: theme.color.fallbackPin, pinned: false });
      routePointHoverPopup.setLngLat([node.lng, node.lat]).setDOMContent(card).addTo(map);
    });
    map.on("mouseleave", "route-points", () => { routePointHoverPopup.remove(); });

    for (const layer of ["route-poi-unclustered", "route-poi-clusters", "route-points"]) {
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

  // Redraw the route when the node chain or leg geometry changes. The line/points
  // always redraw; the camera only re-fits when node ids/coords change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const lineSrc = map.getSource("route-line") as GeoJSONSource | undefined;
    const pointSrc = map.getSource("route-points") as GeoJSONSource | undefined;
    if (!lineSrc || !pointSrc) return;
    const { line, points } = routeLine(nodes, legs, passedNodeIds);
    lineSrc.setData(line);
    pointSrc.setData(points);
    const sig = routeSignature(nodes);
    if (sig !== lastFitSigRef.current) {
      fitToNodes(map, nodes);
      lastFitSigRef.current = sig;
    }
  }, [nodes, legs, passedNodeIds]);

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

  // Highlight the hovered/focused itinerary row's point on the map, and show a
  // transient mini card on it (desktop hover/focus preview).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("route-point-highlight")) return;
    map.setFilter("route-point-highlight", ["==", ["get", "id"], highlightNodeId ?? -1]);

    if (highlightNodeId == null) {
      hoverCardRef.current?.remove();
      return;
    }
    if (openPopupRef.current) {
      // A pinned card is already open — suppress the transient hover card so
      // only one card is ever visible at a time.
      hoverCardRef.current?.remove();
      return;
    }
    const node = nodesRef.current.find((n) => n.id === highlightNodeId);
    if (!node) {
      hoverCardRef.current?.remove();
      return;
    }
    const poi = node.poi_id != null ? poiByIdRef.current[node.poi_id] : undefined;
    const card = poi
      ? buildPoiMiniCard({ poi, color: categoryColorFor(poi), pinned: false })
      : buildPoiMiniCard({ poi: { name: node.name, image_url: null, website: null } as unknown as Poi, color: theme.color.fallbackPin, pinned: false });
    if (!hoverCardRef.current) {
      hoverCardRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "220px" });
    }
    hoverCardRef.current.setLngLat([node.lng, node.lat]).setDOMContent(card).addTo(map);
  }, [highlightNodeId]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
