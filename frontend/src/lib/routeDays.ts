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

/** Base stay (arrival date + span in days) governing list position `pos`,
 * ignoring the node with id `ignoreId`. Walks position order up to `pos`. */
function baseStayAt(route: RouteDetail, pos: number, ignoreId: number): { arrive: string; span: number } {
  let arrive = route.start_date;
  let span = 0;
  const ordered = [...route.nodes].filter((n) => n.id !== ignoreId).sort((a, b) => a.position - b.position);
  for (const n of ordered) {
    if (n.position >= pos) break;
    if (n.kind === "stay") {
      const a = n.arrive_date ?? arrive;
      const d = n.depart_date ?? addDays(a, n.nights ?? 0);
      arrive = a;
      span = Math.max(0, daysBetween(a, d));
    }
  }
  return { arrive, span };
}

/** Where to insert a new stop so it lands in day-group `groupIndex`: a list
 * position at the end of that day's block, and the matching `day_offset`.
 * Position and offset are derived together so they can never disagree. */
export function placeInDay(route: RouteDetail, groups: DayGroup[], groupIndex: number): { position: number; day_offset: number } {
  const target = groups[groupIndex];
  const nodes = route.nodes;

  // Anchor: last node (list order) on the target day or the nearest earlier day.
  let anchor: RouteNode | null = null;
  for (let k = groupIndex; k >= 0; k--) {
    const g = groups[k];
    if (g.nodes.length) { anchor = g.nodes[g.nodes.length - 1]; break; }
  }

  let position: number;
  if (!anchor) {
    position = nodes.length ? nodes[0].position - 1 : 1;
  } else {
    const i = nodes.findIndex((n) => n.id === anchor!.id);
    const next = nodes[i + 1];
    position = next ? (anchor.position + next.position) / 2 : anchor.position + 1;
  }

  const base = baseStayAt(route, position, -1);
  const day_offset = clamp(daysBetween(base.arrive, target.dayKey), 0, base.span);
  return { position, day_offset };
}

/** Where to drop an existing node so it lands in day-group `groupIndex`: a list
 * position at the end of that day's block and the matching `day_offset`, with the
 * dragged node itself excluded from the scan. Used when a node is dropped onto an
 * empty day, which has no sortable row of its own to anchor against. */
export function dropIntoDay(route: RouteDetail, groups: DayGroup[], groupIndex: number, draggedId: number): { position: number; day_offset: number } {
  const target = groups[groupIndex];
  const ordered = [...route.nodes].filter((n) => n.id !== draggedId).sort((a, b) => a.position - b.position);

  // Anchor: last node (excluding the dragged one) on the target day or the
  // nearest earlier day.
  let anchor: RouteNode | null = null;
  for (let k = groupIndex; k >= 0; k--) {
    const ns = groups[k].nodes.filter((n) => n.id !== draggedId);
    if (ns.length) { anchor = ns[ns.length - 1]; break; }
  }

  let position: number;
  if (!anchor) {
    position = ordered.length ? ordered[0].position - 1 : 1;
  } else {
    const i = ordered.findIndex((n) => n.id === anchor!.id);
    const next = ordered[i + 1];
    position = next ? (anchor.position + next.position) / 2 : anchor.position + 1;
  }

  const base = baseStayAt(route, position, draggedId);
  const day_offset = clamp(daysBetween(base.arrive, target.dayKey), 0, base.span);
  return { position, day_offset };
}

/** New `day_offset` for a stop dragged to list `position` and dropped onto the
 * node `overId` (whose day is the target). Excludes the dragged node from the
 * base-stay scan so it doesn't count itself. */
export function dayOffsetForDrop(route: RouteDetail, groups: DayGroup[], overId: number, position: number, draggedId: number): number {
  const targetGroup = groups.find((g) => g.nodes.some((n) => n.id === overId));
  if (!targetGroup) return 0;
  const base = baseStayAt(route, position, draggedId);
  return clamp(daysBetween(base.arrive, targetGroup.dayKey), 0, base.span);
}
