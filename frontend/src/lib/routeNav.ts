import type { DayGroup } from "./routeDays";

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
}

/** The ordered stops to navigate for the day at `index`. A day starts from the
 * previous day's last node (where you slept), so the exported route matches the
 * day's displayed driving total. The first day starts at its own first stop. */
export function dayWaypoints(groups: DayGroup[], index: number): Waypoint[] {
  const pts: Waypoint[] = [];
  if (index > 0) {
    const prev = groups[index - 1].nodes;
    const last = prev[prev.length - 1];
    if (last) pts.push({ name: last.name, lat: last.lat, lng: last.lng });
  }
  for (const n of groups[index].nodes) pts.push({ name: n.name, lat: n.lat, lng: n.lng });
  return pts;
}

const ll = (w: Waypoint) => `${w.lat},${w.lng}`;

/** Google Maps directions URL: origin + destination + intermediate waypoints.
 * The one link that reconstitutes a multi-stop route inside the native app on
 * both iOS and Android. Assumes at least one waypoint. */
export function googleMapsDirUrl(pts: Waypoint[]): string {
  const mid = pts.slice(1, -1);
  const p = new URLSearchParams({ api: "1", origin: ll(pts[0]), destination: ll(pts[pts.length - 1]), travelmode: "driving" });
  if (mid.length) p.set("waypoints", mid.map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

/** Apple Maps directions. Apple's URL scheme reliably supports only a single
 * origin→destination pair, so intermediate stops are dropped. */
export function appleMapsUrl(pts: Waypoint[]): string {
  const p = new URLSearchParams({ saddr: ll(pts[0]), daddr: ll(pts[pts.length - 1]), dirflg: "d" });
  return `https://maps.apple.com/?${p.toString()}`;
}

/** GPX 1.1 route document of the day's stops in order. */
export function toGpx(pts: Waypoint[], name: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rtepts = pts.map((w) => `    <rtept lat="${w.lat}" lon="${w.lng}"><name>${esc(w.name)}</name></rtept>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MinimalPOI" xmlns="http://www.topografix.com/GPX/1/1">
  <rte><name>${esc(name)}</name>
${rtepts}
  </rte>
</gpx>
`;
}

/** Human-readable ordered list for the clipboard. */
export function coordsText(pts: Waypoint[]): string {
  return pts.map((w, i) => `${i + 1}. ${w.name}\n${w.lat},${w.lng}`).join("\n");
}
