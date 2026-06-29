import type { Poi, PoiFilter } from "../types/api";

export interface FilterContext {
  myVisitedPoiIds: Set<number>;
}

export function filterPois(pois: Poi[], filter: PoiFilter, ctx: FilterContext): Poi[] {
  const q = filter.search.trim().toLowerCase();
  return pois.filter((p) => {
    if (
      filter.categoryIds.length > 0 &&
      (p.category_id == null || !filter.categoryIds.includes(p.category_id))
    ) {
      return false;
    }
    if (q) {
      const hay = `${p.name} ${p.address ?? ""} ${p.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter.visited === "visited" && !ctx.myVisitedPoiIds.has(p.id)) return false;
    if (filter.visited === "not" && ctx.myVisitedPoiIds.has(p.id)) return false;
    return true;
  });
}
