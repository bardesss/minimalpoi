/**
 * A stable signature of a route's node chain by id + coordinates. Deliberately
 * ignores array identity, leg geometry, and passed/highlight state so the route
 * map only re-fits its camera when the actual pin positions change — not on
 * every refetch or a teammate's live-sync edit (the camera-hijack fix).
 */
export function routeSignature(nodes: { id: number; lat: number; lng: number }[]): string {
  return nodes.map((n) => `${n.id}:${n.lat}:${n.lng}`).join("|");
}
