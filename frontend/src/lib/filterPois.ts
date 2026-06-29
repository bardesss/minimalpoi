import type { Poi, PoiFilter } from "../types/api";
import { countryNameFromCode } from "./country";

export interface FilterContext {
  myVisitedPoiIds: Set<number>;
}

/** Lower-case and strip diacritics so "cafe" matches "café" and vice-versa. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Levenshtein edit distance, capped early once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; // no point continuing
    prev = curr;
  }
  return prev[b.length];
}

function searchHaystack(p: Poi): string {
  const country = p.country_code ? `${p.country_code} ${countryNameFromCode(p.country_code) ?? ""}` : "";
  return fold(`${p.name} ${p.address ?? ""} ${p.tags.join(" ")} ${p.city ?? ""} ${country}`);
}

/** Substring match, with a typo-tolerant fallback for longer queries. */
function matchesQuery(hay: string, q: string): boolean {
  if (hay.includes(q)) return true;
  if (q.length < 4) return false; // fuzzy on very short queries is too noisy
  const threshold = q.length <= 6 ? 1 : 2;
  return hay.split(/\s+/).some((word) => word.length >= 3 && editDistance(word, q, threshold) <= threshold);
}

export function filterPois(pois: Poi[], filter: PoiFilter, ctx: FilterContext): Poi[] {
  const q = fold(filter.search.trim());
  return pois.filter((p) => {
    if (
      filter.categoryIds.length > 0 &&
      (p.category_id == null || !filter.categoryIds.includes(p.category_id))
    ) {
      return false;
    }
    if (q && !matchesQuery(searchHaystack(p), q)) return false;
    if (filter.visited === "visited" && !ctx.myVisitedPoiIds.has(p.id)) return false;
    if (filter.visited === "not" && ctx.myVisitedPoiIds.has(p.id)) return false;
    return true;
  });
}
