import type { Poi } from "../types/api";
import type { SortMode } from "./sortPref";

/** Squared-ish great-circle distance in km (haversine). Only used for ordering,
 * so absolute accuracy doesn't matter — relative order does. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Order the (already filtered) place list. Returns a new array; the input is not
 * mutated. `center` is the current map center, used only for "distance" — when
 * it's null (no map yet) distance falls back to the default "recent" order.
 */
export function sortPois(pois: Poi[], mode: SortMode, center: { lng: number; lat: number } | null): Poi[] {
  const out = [...pois];
  switch (mode) {
    case "name":
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "rating":
      // Highest average first; unrated places sink to the bottom. Ties break on
      // the number of ratings, then name, so the order is stable and sensible.
      out.sort(
        (a, b) =>
          (b.avg_rating ?? -1) - (a.avg_rating ?? -1) ||
          b.rating_count - a.rating_count ||
          a.name.localeCompare(b.name),
      );
      break;
    case "distance":
      if (!center) return sortPois(out, "recent", null);
      out.sort(
        (a, b) =>
          distanceKm(center.lat, center.lng, a.lat, a.lng) -
          distanceKm(center.lat, center.lng, b.lat, b.lng),
      );
      break;
    case "recent":
    default:
      // Newest first. id is a monotonic autoincrement, so it tracks creation
      // order without needing to parse timestamps.
      out.sort((a, b) => b.id - a.id);
      break;
  }
  return out;
}
