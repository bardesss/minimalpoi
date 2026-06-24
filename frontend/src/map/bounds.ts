import type { Poi } from "../types/api";

export function boundsOf(pois: Poi[]): [[number, number], [number, number]] | null {
  if (pois.length === 0) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const p of pois) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}
