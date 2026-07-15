import type { Poi, RouteNode } from "../types/api";

// POIs already used as a route node (by poi_id) are dropped, so an added place
// shows only as its route marker — never doubled as a nearby dot.
export function poisNotInRoute(pois: Poi[], nodes: RouteNode[]): Poi[] {
  const used = new Set(
    nodes.map((n) => n.poi_id).filter((id): id is number => id != null),
  );
  return pois.filter((p) => !used.has(p.id));
}
