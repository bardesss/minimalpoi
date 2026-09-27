import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from "react";
import type { Map as MlMap } from "maplibre-gl";
import { createInsetsStore, paddingFor, sameInsets, ZERO_INSETS, type Insets, type InsetsStore } from "./mapInsets";

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
  // update (not remove-then-add, which would animate the map twice).
  useEffect(() => {
    if (!store || !active) return;
    store.set(key, { top, right, bottom, left });
  }, [store, key, active, top, right, bottom, left]);
  useEffect(() => {
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

/** Keep `mapRef.current`'s padding in sync with the registered insets, so
 * flyTo/easeTo/fitBounds centre on the visible part of the map. Must be called
 * after the effect that creates the map (effects run in declaration order). */
export function useApplyMapInsets(mapRef: RefObject<MlMap | null>): void {
  const store = useContext(MapInsetsContext);
  useEffect(() => {
    const map = mapRef.current;
    if (!store || !map) return;
    let waiting = false;

    function onMoveEnd() {
      waiting = false;
      update();
    }

    function update() {
      const target = paddingFor(map!, store!.get());
      if (sameInsets(target, map!.getPadding() as Insets)) return;
      // setPadding/easeTo would stop an in-flight camera move; defer until it ends.
      if (map!.isMoving()) {
        if (!waiting) {
          waiting = true;
          map!.once("moveend", onMoveEnd);
        }
        return;
      }
      map!.easeTo({ padding: target, duration: 250 });
    }

    const initial = paddingFor(map, store.get());
    if (!sameInsets(initial, map.getPadding() as Insets)) map.setPadding(initial);
    const unsubscribe = store.subscribe(update);
    return () => {
      unsubscribe();
      map.off("moveend", onMoveEnd);
    };
  }, [store, mapRef]);
}
