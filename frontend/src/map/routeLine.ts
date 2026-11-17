import type { RouteLeg, RouteNode } from "../types/api";
import { formatTravel } from "../lib/formatTravel";
import { decodePolyline } from "./polyline";

export function routeLine(
  nodes: RouteNode[],
  legs: RouteLeg[] = [],
  passedNodeIds: Set<number> = new Set(),
  dayIndexByNode: Map<number, number> = new Map(),
) {
  let seq = 0;
  const points: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nodes.map((n, order) => {
      const properties: Record<string, unknown> = {
        order, kind: n.kind, name: n.name, id: n.id, passed: passedNodeIds.has(n.id),
        day: dayIndexByNode.get(n.id) ?? 0,
      };
      // Role nodes (start/end) get a glyph; every other node gets the next
      // sequence number. This counter is the numbering the itinerary mirrors.
      if (n.role) properties.role = n.role;
      else properties.seq = ++seq;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [n.lng, n.lat] },
        properties,
      };
    }),
  };

  // One segment feature per leg, following the leg's real driving geometry when
  // Google supplied one; otherwise a straight line between the pair. A segment
  // is "passed" iff the node it drives INTO is passed — matching how a day's
  // driving total attributes the inbound leg.
  const legByPair = new Map(legs.map((l) => [`${l.from_node_id}:${l.to_node_id}`, l]));
  const segments: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const leg = legByPair.get(`${a.id}:${b.id}`);
    const coordinates: [number, number][] = leg?.geometry
      ? decodePolyline(leg.geometry)
      : [[a.lng, a.lat], [b.lng, b.lat]];
    const properties: Record<string, unknown> = {
      passed: passedNodeIds.has(b.id),
      day: dayIndexByNode.get(b.id) ?? 0,
    };
    // The travel label the map draws along the segment, mirroring the
    // itinerary's LegRow. Formatted here rather than in a MapLibre expression so
    // the km/minute rounding keeps one home. A leg carrying no usable numbers
    // gets no `label` key at all — that absence is what the layer's
    // ["has", "label"] filter selects on, so it can never render "NaN km".
    if (leg && Number.isFinite(leg.distance_m) && Number.isFinite(leg.duration_s)) {
      properties.distance_m = leg.distance_m;
      properties.duration_s = leg.duration_s;
      properties.label =
        formatTravel(leg.distance_m, leg.duration_s) + (leg.source === "estimate" ? " · est." : "");
    }
    segments.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties,
    });
  }

  const line: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: segments };
  return { line, points };
}
