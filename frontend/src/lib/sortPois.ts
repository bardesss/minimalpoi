import type { Poi } from "../types/api";
import type { SortMode } from "./sortPref";
import { distanceKm } from "./geo";

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
    case "distance": {
      if (!center) return sortPois(out, "recent", null);
      // Schwartzian transform: measure each place once, then sort on the key.
      const keyed = out.map((p) => ({ p, d: distanceKm(center.lat, center.lng, p.lat, p.lng) }));
      keyed.sort((a, b) => a.d - b.d);
      return keyed.map((k) => k.p);
    }
    case "recent":
    default:
      // Newest first. id is a monotonic autoincrement, so it tracks creation
      // order without needing to parse timestamps.
      out.sort((a, b) => b.id - a.id);
      break;
  }
  return out;
}
