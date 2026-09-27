import type { Map as MlMap } from "maplibre-gl";

/** Pixels of the map covered by UI on each side (sheet, panel, …). */
export interface Insets { top: number; right: number; bottom: number; left: number }

export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Minimum map (px) left visible on each axis once insets are applied —
 * below this MapLibre can't fit bounds and the view is unusable anyway. */
export const MIN_VISIBLE = 120;

export interface InsetsStore {
  /** Register/replace the inset for `key`; `null` removes it. */
  set(key: string, inset: Partial<Insets> | null): void;
  /** Current per-side sum of every registered inset. */
  get(): Insets;
  /** Called after the summed insets actually change. Returns an unsubscribe. */
  subscribe(fn: () => void): () => void;
}

export function sameInsets(a: Insets, b: Insets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

export function createInsetsStore(): InsetsStore {
  const entries = new Map<string, Partial<Insets>>();
  const subs = new Set<() => void>();
  let total = ZERO_INSETS;

  function sum(): Insets {
    const t = { ...ZERO_INSETS };
    for (const e of entries.values()) {
      t.top += e.top ?? 0;
      t.right += e.right ?? 0;
      t.bottom += e.bottom ?? 0;
      t.left += e.left ?? 0;
    }
    return t;
  }

  return {
    set(key, inset) {
      if (inset) entries.set(key, inset);
      else entries.delete(key);
      const next = sum();
      if (sameInsets(next, total)) return;
      total = next;
      subs.forEach((fn) => fn());
    },
    get: () => total,
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

/** Trim insets so at least `min` px of map stays visible on each axis.
 * Bottom/right give way first (the sheet and docked panels live there). */
export function clampInsets(i: Insets, width: number, height: number, min = MIN_VISIBLE): Insets {
  const maxV = Math.max(0, height - min);
  const top = Math.min(i.top, maxV);
  const bottom = Math.min(i.bottom, maxV - top);
  const maxH = Math.max(0, width - min);
  const left = Math.min(i.left, maxH);
  const right = Math.min(i.right, maxH - left);
  return { top, right, bottom, left };
}

/** The padding to hand MapLibre for `insets` on this map's container. */
export function paddingFor(map: MlMap, insets: Insets): Insets {
  const c = map.getContainer();
  return clampInsets(insets, c.clientWidth, c.clientHeight);
}

/** Geo point under the container's centre pixel. Unlike `map.getCenter()`,
 * this ignores padding — it's what a screen-centred crosshair points at. */
export function containerCenter(map: MlMap): { lng: number; lat: number } {
  const c = map.getContainer();
  const ll = map.unproject([c.clientWidth / 2, c.clientHeight / 2]);
  return { lng: ll.lng, lat: ll.lat };
}
