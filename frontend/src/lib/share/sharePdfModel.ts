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

// Windows-1252 characters outside Latin-1 (its 0x80-0x9F block), which the
// PDF's built-in Helvetica can draw.
const WINANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** True when jsPDF's built-in (WinAnsi-encoded) fonts can draw every character. */
export function isWinAnsi(s: string): boolean {
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code <= 0x7f || (code >= 0xa0 && code <= 0xff) || WINANSI_EXTRAS.has(ch)) continue;
    return false;
  }
  return true;
}

/** The day label in the user's language, or English when that language needs
 * glyphs the PDF font lacks (e.g. Polish "ŚR", Cyrillic). */
function pdfDayLabel(dayKey: string): string {
  const label = formatDayLabel(dayKey);
  return isWinAnsi(label) ? label : formatDayLabel(dayKey, "en-GB");
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
    label: pdfDayLabel(g.dayKey),
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
