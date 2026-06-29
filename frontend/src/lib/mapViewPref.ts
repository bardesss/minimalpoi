// Persisted preference for how the map frames itself: "fit" auto-fits to the
// current results, "center" uses the configured default center/zoom. Stored in
// localStorage so it survives reloads.
export type MapViewMode = "fit" | "center";

const KEY = "minimalpoi.mapView";

export function readMapViewMode(): MapViewMode {
  try {
    return localStorage.getItem(KEY) === "fit" ? "fit" : "center";
  } catch {
    return "center";
  }
}

export function writeMapViewMode(mode: MapViewMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode / storage disabled — preference just won't persist */
  }
}
