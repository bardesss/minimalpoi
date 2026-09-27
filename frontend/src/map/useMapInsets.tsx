import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import type { Map as MlMap } from "maplibre-gl";
import { createInsetsStore, paddingFor, ZERO_INSETS, type Insets, type InsetsStore } from "./mapInsets";

const MapInsetsContext = createContext<InsetsStore | null>(null);

/** One store for the app: any component covering the map registers here, and
 * every map (main or route) pads its camera by the sum. */
export function MapInsetsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createInsetsStore);
  return <MapInsetsContext.Provider value={store}>{children}</MapInsetsContext.Provider>;
}

/** Declare that this component covers part of the map while mounted. Pass
 * `null` when it currently covers nothing (e.g. a full-screen overlay). */
export function useMapInset(key: string, inset: Partial<Insets> | null): void {
  const store = useContext(MapInsetsContext);
  const active = inset != null;
  const top = inset?.top ?? 0;
  const right = inset?.right ?? 0;
  const bottom = inset?.bottom ?? 0;
  const left = inset?.left ?? 0;
  // Values and lifetime are separate effects so a value change is ONE store
  // update (not remove-then-add, which would animate the map twice). Layout
  // effects, so every inset is registered before any passive effect runs —
  // a map mounting in the same commit then starts with the right padding.
  useLayoutEffect(() => {
    if (!store || !active) return;
    store.set(key, { top, right, bottom, left });
  }, [store, key, active, top, right, bottom, left]);
  useLayoutEffect(() => {
    if (!store || !active) return;
    return () => store.set(key, null);
  }, [store, key, active]);
}

const getZero = () => ZERO_INSETS;

/** Stable getter for the current summed insets. */
export function useMapInsetsReader(): () => Insets {
  const store = useContext(MapInsetsContext);
  return store ? store.get : getZero;
}

/** Within half a pixel on every side — MapLibre eases padding in floats. */
function closeInsets(a: Insets, b: Insets): boolean {
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.right - b.right) < 0.5
    && Math.abs(a.bottom - b.bottom) < 0.5 && Math.abs(a.left - b.left) < 0.5;
}

/** Keep `mapRef.current`'s padding in sync with the registered insets, so
 * flyTo/easeTo/fitBounds centre on the visible part of the map. Must be called
 * after the effect that creates the map (effects run in declaration order). */
export function useApplyMapInsets(mapRef: RefObject<MlMap | null>): void {
  const store = useContext(MapInsetsContext);
  useEffect(() => {
    const map = mapRef.current;
    if (!store || !map) return;
    let live = true;
    let queued = false;

    function update() {
      const target = paddingFor(map!, store!.get());
      if (closeInsets(target, map!.getPadding() as Insets)) return;
      // setPadding/easeTo would stop an in-flight camera move; the moveend
      // listener below retries once it ends.
      if (map!.isMoving()) return;
      map!.easeTo({ padding: target, duration: 250 });
    }

    // Run after the current effect flush / event dispatch, so a camera move
    // started in the same commit (the selection flyTo) isn't pre-empted by a
    // padding ease it would cancel straight away.
    function schedule() {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (live) update();
      });
    }

    const initial = paddingFor(map, store.get());
    if (!closeInsets(initial, map.getPadding() as Insets)) map.setPadding(initial);
    const unsubscribe = store.subscribe(schedule);
    // Every settled move reconciles: a padding ease cut short by a gesture or
    // another camera move is finished off here. A resize re-clamps.
    map.on("moveend", schedule);
    map.on("resize", schedule);
    return () => {
      live = false;
      unsubscribe();
      map.off("moveend", schedule);
      map.off("resize", schedule);
    };
  }, [store, mapRef]);
}
