import type { RouteDetail, RouteNode, RouteNodeKind } from "../../types/api";
import { shareStats } from "./shareStats";
import { groupNodesByDay } from "../routeDays";
import { formatDayLabel } from "../formatDayLabel";
import { formatTravel } from "../formatTravel";

export interface SharePdfLeg { text: string; estimate: boolean }
export interface SharePdfRow { seq: number; name: string; kind: RouteNodeKind; note: string | null; inboundLeg: SharePdfLeg | null }
export interface SharePdfDay { label: string; drivingTotal: string | null; rows: SharePdfRow[] }
export interface SharePdfBookend { label: string; name: string }
export interface SharePdfModel {
  header: { name: string; dateRange: string; stats: ReturnType<typeof shareStats> };
  startBookend: SharePdfBookend | null;
  endBookend: SharePdfBookend | null;
  days: SharePdfDay[];
}

export function sharePdfModel(route: RouteDetail): SharePdfModel {
  const middle = route.nodes.filter((n) => n.role == null);
  const startNode = route.nodes.find((n) => n.role === "start") ?? null;
  const endNode = route.nodes.find((n) => n.role === "end") ?? null;

  const indexById = new Map(middle.map((n, i) => [n.id, i]));
  const legByPair = new Map<string, RouteDetail["legs"][number]>();
  for (const l of route.legs) legByPair.set(`${l.from_node_id}:${l.to_node_id}`, l);

  const toRow = (n: RouteNode): SharePdfRow => {
    const i = indexById.get(n.id)!;
    const prev = i > 0 ? middle[i - 1] : undefined;
    const leg = prev ? legByPair.get(`${prev.id}:${n.id}`) : undefined;
    return {
      seq: i + 1,
      name: n.name,
      kind: n.kind,
      note: n.notes,
      inboundLeg: leg ? { text: formatTravel(leg.distance_m, leg.duration_s), estimate: leg.source === "estimate" } : null,
    };
  };

  const days: SharePdfDay[] = groupNodesByDay({ ...route, nodes: middle }).map((g) => ({
    label: formatDayLabel(g.dayKey),
    drivingTotal: g.driving_distance_m > 0 ? formatTravel(g.driving_distance_m, g.driving_duration_s) : null,
    rows: g.nodes.map(toRow),
  }));

  let endBookend: SharePdfBookend | null = null;
  if (route.round_trip) {
    if (endNode || startNode) endBookend = { label: "Ending point", name: `Return to ${startNode?.name ?? "start"}` };
  } else if (endNode) {
    endBookend = { label: "Ending point", name: endNode.name };
  }

  return {
    header: {
      name: route.name,
      dateRange: `${route.start_date} → ${route.end_date ?? route.scheduled_end_date}`,
      stats: shareStats(route),
    },
    startBookend: startNode ? { label: "Starting point", name: startNode.name } : null,
    endBookend,
    days,
  };
}
