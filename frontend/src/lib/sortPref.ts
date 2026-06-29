// Persisted preference for how the place list is ordered. Stored in localStorage
// so it survives reloads, like the map-view preference.
export type SortMode = "recent" | "name" | "rating" | "distance";

const KEY = "minimalpoi.sort";
const VALID: SortMode[] = ["recent", "name", "rating", "distance"];

export function readSortMode(): SortMode {
  try {
    const v = localStorage.getItem(KEY) as SortMode | null;
    return v && VALID.includes(v) ? v : "recent";
  } catch {
    return "recent";
  }
}

export function writeSortMode(mode: SortMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode / storage disabled — preference just won't persist */
  }
}
