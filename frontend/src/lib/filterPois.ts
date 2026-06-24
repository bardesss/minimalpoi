import type { Poi } from "../types/api";

export function filterPois(pois: Poi[], search: string, activeCategoryIds: number[]): Poi[] {
  const q = search.trim().toLowerCase();
  return pois.filter((p) => {
    if (activeCategoryIds.length > 0 && (p.category_id == null || !activeCategoryIds.includes(p.category_id))) {
      return false;
    }
    if (!q) return true;
    const hay = `${p.name} ${p.address ?? ""} ${p.tags.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}
