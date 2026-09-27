import { useEffect, useRef, type RefObject } from "react";
import type { Map as MlMap } from "maplibre-gl";
import type { Poi } from "../types/api";
import { paddingFor } from "./mapInsets";
import { useMapInsetsReader } from "./useMapInsets";

/** A request to fly to a POI; bump `seq` to re-fly to the same id. */
export interface FlyRequest { id: number; seq: number }

/**
 * Fly the camera to the requested POI. Runs as an effect in the component that
 * owns the selection, i.e. AFTER its children's effects in the same commit —
 * so a detail panel opened by this selection has already registered its inset
 * and the flight centres in the part of the map still visible.
 */
export function useFlyToSelection(mapRef: RefObject<MlMap | null>, pois: Poi[] | undefined, request: FlyRequest | null): void {
  const getInsets = useMapInsetsReader();
  // Latest list without re-flying on every refetch.
  const poisRef = useRef(pois);
  useEffect(() => {
    poisRef.current = pois;
  });

  useEffect(() => {
    if (!request) return;
    const map = mapRef.current;
    const poi = (poisRef.current ?? []).find((p) => p.id === request.id);
    if (!map || !poi) return;
    map.flyTo({
      center: [poi.lng, poi.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 600,
      padding: paddingFor(map, getInsets()),
    });
  }, [request, mapRef, getInsets]);
}
