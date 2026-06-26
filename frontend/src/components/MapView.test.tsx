// frontend/src/components/MapView.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";
import type { Map as MlMap } from "maplibre-gl";
import MapView from "./MapView";
import type { Category, MapSettings, Poi } from "../types/api";

// IMPORTANT: vi.mock is hoisted above all top-level code, so the factory may
// only reference variables created via vi.hoisted (also hoisted). Declaring the
// mock objects as plain consts here would throw "Cannot access before
// initialization" when the factory runs.
const { handlers, mapInstance, MapMock } = vi.hoisted(() => {
  const handlers: Record<string, () => void> = {};
  const mapInstance = {
    addControl: vi.fn(),
    on: vi.fn((evt: string, _layerOrFn: unknown, fn?: () => void) => {
      if (evt === "load") handlers.load = _layerOrFn as () => void;
      else handlers[`${evt}:${typeof _layerOrFn === "string" ? _layerOrFn : ""}`] = (fn ?? (_layerOrFn as () => void));
    }),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(() => ({ setData: vi.fn(), getClusterExpansionZoom: vi.fn() })),
    getLayer: vi.fn(() => true),
    setFilter: vi.fn(),
    setData: vi.fn(),
    remove: vi.fn(),
    resize: vi.fn(),
    easeTo: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
  };
  const MapMock = vi.fn(() => mapInstance);
  return { handlers, mapInstance, MapMock };
});

// jsdom has no ResizeObserver; MapView installs one to call map.resize().
class FakeResizeObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", FakeResizeObserver);

vi.mock("maplibre-gl", () => ({
  default: {
    Map: MapMock,
    NavigationControl: vi.fn(),
  },
  Map: MapMock,
  NavigationControl: vi.fn(),
}));

const settings: MapSettings = { map_tile_url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json", default_map_center_lat: 52.3676, default_map_center_lng: 4.9041, default_map_zoom: 11 };
const categories: Category[] = [{ id: 1, name: "R", color: "#E1574C", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" }];
const pois: Poi[] = [{ id: 1, name: "A", address: null, city: null, country_code: null, lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "s" }];

beforeEach(() => {
  MapMock.mockClear();
  Object.values(mapInstance).forEach((m) => typeof m === "function" && (m as ReturnType<typeof vi.fn>).mockClear?.());
});

describe("MapView", () => {
  it("constructs the map with the resolved style + center/zoom and adds layers on load", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={() => {}} onMapClick={() => {}} addMode={false} mapRef={mapRef} />);
    expect(MapMock).toHaveBeenCalledTimes(1);
    const args = (MapMock.mock.calls[0] as unknown[])[0] as { style: unknown; center: number[]; zoom: number };
    expect(args.style).toBe(settings.map_tile_url);
    expect(args.center).toEqual([4.9041, 52.3676]);
    expect(args.zoom).toBe(11);
    handlers.load();
    expect(mapInstance.addSource).toHaveBeenCalledWith("pois", expect.objectContaining({ type: "geojson", cluster: true, clusterMaxZoom: 13, clusterRadius: 50 }));
    const layerIds = mapInstance.addLayer.mock.calls.map((c) => (c[0] as { id: string }).id);
    expect(layerIds).toEqual(["clusters", "cluster-count", "unclustered", "poi-selected"]);
  });
});
