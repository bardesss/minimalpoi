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
const { handlers, mapInstance, MapMock, state, GeolocateControlMock, PopupMock, geolocateHandlers } = vi.hoisted(() => {
  const handlers: Record<string, (e?: unknown) => void> = {};
  const geolocateHandlers: Record<string, (e: unknown) => void> = {};
  // Model MapLibre faithfully: the "pois" source does not exist until the
  // async "load" handler calls addSource, so getSource returns undefined
  // before load — this is what makes the load-time data race observable.
  const state = { sourceAdded: false };
  const mapInstance = {
    addControl: vi.fn(),
    on: vi.fn((evt: string, _layerOrFn: unknown, fn?: () => void) => {
      if (evt === "load") handlers.load = _layerOrFn as () => void;
      else handlers[`${evt}:${typeof _layerOrFn === "string" ? _layerOrFn : ""}`] = (fn ?? (_layerOrFn as () => void));
    }),
    addSource: vi.fn(() => { state.sourceAdded = true; }),
    addLayer: vi.fn(),
    getSource: vi.fn(() => (state.sourceAdded ? { setData: vi.fn(), getClusterExpansionZoom: vi.fn() } : undefined)),
    getLayer: vi.fn(() => true),
    setFilter: vi.fn(),
    setData: vi.fn(),
    remove: vi.fn(),
    resize: vi.fn(),
    easeTo: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
  };
  // A regular function (not an arrow) so `new maplibregl.Map()` can construct
  // it — Vitest 4 invokes the mock implementation as a constructor, and arrow
  // functions have no [[Construct]]. Returning the object hands it back as the
  // instance.
  const MapMock = vi.fn(function () { return mapInstance; });
  // A regular function (not an arrow) so `new maplibregl.GeolocateControl()`
  // can construct it — see the MapMock comment above for why. Returns an
  // instance whose `on` captures handlers so tests can drive a "geolocate" fix.
  const GeolocateControlMock = vi.fn(function () {
    return {
      on: vi.fn((evt: string, fn: (e: unknown) => void) => { geolocateHandlers[evt] = fn; }),
    };
  });
  // Chainable Popup mock: MapView's init effect constructs `new
  // maplibregl.Popup(...)` synchronously, so this must exist even though the
  // existing tests never drive a hover event that would call its methods.
  // A regular function (not an arrow) so `new maplibregl.Popup()` can
  // construct it — see the MapMock comment above for why.
  const PopupMock = vi.fn(function () {
    const popup = {
      setLngLat: vi.fn(() => popup),
      setText: vi.fn(() => popup),
      setDOMContent: vi.fn(() => popup),
      addTo: vi.fn(() => popup),
      remove: vi.fn(() => popup),
    };
    return popup;
  });
  return { handlers, mapInstance, MapMock, state, GeolocateControlMock, PopupMock, geolocateHandlers };
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
    GeolocateControl: GeolocateControlMock,
    Popup: PopupMock,
  },
  Map: MapMock,
  NavigationControl: vi.fn(),
  GeolocateControl: GeolocateControlMock,
  Popup: PopupMock,
}));

const settings: MapSettings = { map_tile_url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json", default_map_center_lat: 52.3676, default_map_center_lng: 4.9041, default_map_zoom: 11, routes_enabled: false };
const categories: Category[] = [{ id: 1, name: "R", color: "#E1574C", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" }];
const pois: Poi[] = [{ id: 1, name: "A", address: null, city: null, country_code: null, lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "s", avg_rating: null, rating_count: 0 }];

beforeEach(() => {
  MapMock.mockClear();
  GeolocateControlMock.mockClear();
  PopupMock.mockClear();
  state.sourceAdded = false;
  Object.values(mapInstance).forEach((m) => typeof m === "function" && (m as ReturnType<typeof vi.fn>).mockClear?.());
  for (const k of Object.keys(geolocateHandlers)) delete geolocateHandlers[k];
});

describe("MapView", () => {
  it("constructs the map with the resolved style + center/zoom and adds layers on load", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={() => {}} onMapClick={() => {}} addMode={false} visitedPoiIds={new Set()} mapRef={mapRef} />);
    expect(MapMock).toHaveBeenCalledTimes(1);
    const args = (MapMock.mock.calls[0] as unknown[])[0] as { style: unknown; center: number[]; zoom: number };
    expect(args.style).toBe(settings.map_tile_url);
    expect(args.center).toEqual([4.9041, 52.3676]);
    expect(args.zoom).toBe(11);
    handlers.load();
    expect(mapInstance.addSource).toHaveBeenCalledWith("pois", expect.objectContaining({ type: "geojson", cluster: true, clusterMaxZoom: 13, clusterRadius: 50 }));
    const layerIds = mapInstance.addLayer.mock.calls.map((c) => (c[0] as { id: string }).id);
    expect(layerIds).toEqual(["clusters", "cluster-count", "poi-visited", "unclustered", "poi-selected"]);
  });

  it("seeds the source with the latest pois when data arrives before the map finishes loading", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    const props = { categories, settings, selectedId: null, onSelect: () => {}, onMapClick: () => {}, addMode: false, visitedPoiIds: new Set<number>(), mapRef };
    // Mount while the POI query is still loading (empty list).
    const { rerender } = render(<MapView pois={[]} {...props} />);
    // Query resolves BEFORE MapLibre fires "load": the data-sync effect runs,
    // but the source does not exist yet, so its setData is a no-op.
    rerender(<MapView pois={pois} {...props} />);
    // Now the map finishes loading and creates the source.
    handlers.load();
    const sourceCall = (mapInstance.addSource.mock.calls as unknown[][]).find((c) => c[0] === "pois");
    const data = (sourceCall![1] as { data: { features: unknown[] } }).data;
    expect(data.features).toHaveLength(1);
  });

  it("adds a tracking GeolocateControl next to the navigation control", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={() => {}} onMapClick={() => {}} addMode={false} visitedPoiIds={new Set()} mapRef={mapRef} />);
    expect(GeolocateControlMock).toHaveBeenCalledWith(expect.objectContaining({ trackUserLocation: true }));
    // Navigation + Geolocate = two controls added.
    expect(mapInstance.addControl).toHaveBeenCalledTimes(2);
  });

  it("reports the user's location up via onUserLocate when the control gets a fix", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    const onUserLocate = vi.fn();
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={() => {}} onMapClick={() => {}} addMode={false} visitedPoiIds={new Set()} mapRef={mapRef} onUserLocate={onUserLocate} />);
    geolocateHandlers.geolocate({ coords: { longitude: 4.9, latitude: 52.37 } });
    expect(onUserLocate).toHaveBeenCalledWith({ lng: 4.9, lat: 52.37 });
  });

  it("opens a mini-card popup on marker hover", () => {
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={() => {}} onMapClick={() => {}} addMode={false} visitedPoiIds={new Set()} mapRef={mapRef} />);
    handlers.load();
    const move = handlers["mousemove:unclustered"];
    expect(move).toBeTypeOf("function");
    move?.({ features: [{ properties: { id: 1 } }] } as never);
    const popup = PopupMock.mock.results[0].value;
    expect(popup.setDOMContent).toHaveBeenCalled();
    expect(popup.addTo).toHaveBeenCalled();
  });

  it("selects the poi when a marker is clicked", () => {
    const onSelect = vi.fn();
    const mapRef = createRef<MlMap | null>() as { current: MlMap | null };
    render(<MapView pois={pois} categories={categories} settings={settings} selectedId={null} onSelect={onSelect} onMapClick={() => {}} addMode={false} visitedPoiIds={new Set()} mapRef={mapRef} />);
    handlers.load();
    handlers["click:unclustered"]?.({ features: [{ properties: { id: 1 } }] } as never);
    expect(onSelect).toHaveBeenCalledWith(1);
    // The first-constructed Popup is the hoverPopup; clicking a marker must
    // dismiss any transient hover popup left open from a preceding hover.
    expect(PopupMock.mock.results[0].value.remove).toHaveBeenCalled();
  });
});
