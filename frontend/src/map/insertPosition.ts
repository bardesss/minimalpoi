import type { RouteNode } from "../types/api";
import { distanceKm } from "../lib/geo";

/**
 * Cheapest-insertion: pick the slot in the node chain where adding `poi` grows
 * total travel the least, and return the fractional `position` for that slot.
 * Returns null for an empty route so the backend applies its append default.
 * Purely geographic — ignores node kind; the user can reorder afterward.
 */
export function computeInsertPosition(
  nodes: RouteNode[],
  poi: { lat: number; lng: number },
): number | null {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0].position + 1;

  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  // Start with prepend as the incumbent, then interior gaps, then append.
  let bestCost = distanceKm(poi.lat, poi.lng, first.lat, first.lng);
  let bestPos = first.position - 1;

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const detour =
      distanceKm(a.lat, a.lng, poi.lat, poi.lng) +
      distanceKm(poi.lat, poi.lng, b.lat, b.lng) -
      distanceKm(a.lat, a.lng, b.lat, b.lng);
    if (detour < bestCost) {
      bestCost = detour;
      bestPos = (a.position + b.position) / 2;
    }
  }

  const appendCost = distanceKm(last.lat, last.lng, poi.lat, poi.lng);
  if (appendCost < bestCost) {
    bestPos = last.position + 1;
  }

  return bestPos;
}
