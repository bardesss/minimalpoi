import type { RouteDetail, RouteNode } from "../types/api";

export interface DayGroup {
  dayKey: string;               // ISO date, e.g. "2026-07-16"
  driving_distance_m: number;   // 0 when the day has no inbound legs
  driving_duration_s: number;
  nodes: RouteNode[];
}

/** ISO date + n days, built from date parts so a UTC-midnight parse can't shift
 * the day (mirrors formatDayLabel.ts). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** Whole calendar days from `a` to `b` (b - a). UTC for both endpoints, so the
 * subtraction is an exact day count with no DST/timezone drift. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/**
 * Group itinerary nodes by calendar day. A stay emits a day-group for EVERY day
 * in its arrive→depart span (including empty middle days, so they can receive
 * stops). A following stop lands on `baseArrive + clamp(day_offset ?? span)` —
 * `null` means the departure/travel day, matching legacy behavior. A node's
 * inbound leg counts toward the day of the node it drives into; the first node
 * has no inbound leg. A stay's departure day coincides with the next stay's
 * arrival day, so they share a group (the travel day).
 */
export function groupNodesByDay(route: RouteDetail): DayGroup[] {
  const legByPair = new Map<string, RouteDetail["legs"][number]>();
  for (const l of route.legs) legByPair.set(`${l.from_node_id}:${l.to_node_id}`, l);

  const order: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  const ensureDay = (key: string): DayGroup => {
    let g = byKey.get(key);
    if (!g) {
      g = { dayKey: key, driving_distance_m: 0, driving_duration_s: 0, nodes: [] };
      byKey.set(key, g);
      order.push(g);
    }
    return g;
  };

  let cursor = route.start_date;
  let baseArrive = route.start_date;
  let baseSpan = 0;
  let prev: RouteNode | null = null;

  for (const node of route.nodes) {
    let targetKey: string;
    if (node.kind === "stay") {
      const arrive = node.arrive_date ?? cursor;
      const nights = node.nights ?? 0;
      const depart = node.depart_date ?? addDays(arrive, nights);
      const span = Math.max(0, daysBetween(arrive, depart));
      ensureDay(arrive).nodes.push(node);
      for (let d = 1; d <= span; d++) ensureDay(addDays(arrive, d));
      baseArrive = arrive;
      baseSpan = span;
      cursor = depart;
      targetKey = arrive;
    } else {
      const eff = node.day_offset == null ? baseSpan : clamp(node.day_offset, 0, baseSpan);
      targetKey = addDays(baseArrive, eff);
      ensureDay(targetKey).nodes.push(node);
    }

    const inbound = prev ? legByPair.get(`${prev.id}:${node.id}`) : undefined;
    if (inbound) {
      const g = byKey.get(targetKey)!;
      g.driving_distance_m += inbound.distance_m;
      g.driving_duration_s += inbound.duration_s;
    }
    prev = node;
  }

  return order;
}
