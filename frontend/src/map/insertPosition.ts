import type { RouteNode } from "../types/api";
import { distanceKm } from "../lib/geo";

/**
 * Cheapest-insertion: pick the slot in the node chain where adding `poi` grows
 * total travel the least, and return the fractional `position` for that slot.
 * Returns null for an empty route so the backend applies its append default.
 * Purely geographic — ignores node kind; the user can reorder afterward.
 *
 * Slots at or before the last passed node are excluded — you can't travel in
 * the past — so an added place always lands on today or a later day. Append is
 * always allowed and is the fallback when every earlier slot is in the past.
 */
export function computeInsertPosition(
  nodes: RouteNode[],
  poi: { lat: number; lng: number },
  passedNodeIds: Set<number> = new Set(),
): number | null {
  if (nodes.length === 0) return null;

  let floor = -Infinity;
  for (const n of nodes) if (passedNodeIds.has(n.id)) floor = Math.max(floor, n.position);
  const allowed = (pos: number) => pos > floor;

  if (nodes.length === 1) return nodes[0].position + 1;

  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  // Append is always past the last passed node, so it is the guaranteed incumbent.
  let bestCost = distanceKm(last.lat, last.lng, poi.lat, poi.lng);
  let bestPos = last.position + 1;

  const prependPos = first.position - 1;
  if (allowed(prependPos)) {
    const c = distanceKm(poi.lat, poi.lng, first.lat, first.lng);
    if (c < bestCost) { bestCost = c; bestPos = prependPos; }
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const mid = (a.position + b.position) / 2;
    if (!allowed(mid)) continue;
    const detour =
      distanceKm(a.lat, a.lng, poi.lat, poi.lng) +
      distanceKm(poi.lat, poi.lng, b.lat, b.lng) -
      distanceKm(a.lat, a.lng, b.lat, b.lng);
    if (detour < bestCost) { bestCost = detour; bestPos = mid; }
  }

  return bestPos;
}
