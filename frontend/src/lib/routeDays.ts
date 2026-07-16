import type { RouteDetail, RouteNode } from "../types/api";

export interface DayGroup {
  dayKey: string;               // ISO date, e.g. "2026-07-16"
  driving_distance_m: number;   // 0 when the day has no inbound legs
  driving_duration_s: number;
  nodes: RouteNode[];
}

/**
 * Group itinerary nodes by the calendar day they happen on, with each day's
 * driving total. Mirrors the backend cursor rule: a stay belongs to its
 * arrive_date and advances the cursor to its depart_date; a stop belongs to
 * the current cursor (the previous stay's departure day, or the start date
 * before any stay). A node's inbound leg (drive into it) counts toward its
 * day's total; the first node has no inbound leg. Multi-night stays advance
 * the cursor across their whole span, so rest-days produce no group.
 */
export function groupNodesByDay(route: RouteDetail): DayGroup[] {
  const legByPair = new Map<string, RouteDetail["legs"][number]>();
  for (const l of route.legs) legByPair.set(`${l.from_node_id}:${l.to_node_id}`, l);

  const groups: DayGroup[] = [];
  let current = route.start_date;
  let prev: RouteNode | null = null;

  for (const node of route.nodes) {
    const dayKey = node.kind === "stay" ? (node.arrive_date ?? current) : current;
    const inbound = prev ? legByPair.get(`${prev.id}:${node.id}`) : undefined;

    let group = groups[groups.length - 1];
    if (!group || group.dayKey !== dayKey) {
      group = { dayKey, driving_distance_m: 0, driving_duration_s: 0, nodes: [] };
      groups.push(group);
    }
    group.nodes.push(node);
    if (inbound) {
      group.driving_distance_m += inbound.distance_m;
      group.driving_duration_s += inbound.duration_s;
    }

    if (node.kind === "stay") current = node.depart_date ?? current;
    prev = node;
  }
  return groups;
}
