import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Map as MlMap } from "maplibre-gl";
import type { Poi } from "../types/api";
import { MapInsetsProvider, useMapInset } from "./useMapInsets";
import { useFlyToSelection, type FlyRequest } from "./useFlyToSelection";

const poi = { id: 7, lat: 52.36, lng: 4.88 } as Poi;

function makeMap() {
  return {
    getZoom: () => 11,
    getContainer: () => ({ clientWidth: 960, clientHeight: 900 }),
    flyTo: vi.fn(),
  } as unknown as MlMap & { flyTo: ReturnType<typeof vi.fn> };
}

function Host({ map, request, children }: { map: MlMap; request: FlyRequest | null; children?: ReactNode }) {
  const [ref] = useState(() => ({ current: map }));
  useFlyToSelection(ref, [poi], request);
  return <>{children}</>;
}

function Panel() {
  useMapInset("detail-panel", { left: 368 });
  return null;
}

describe("useFlyToSelection", () => {
  it("does nothing without a request", () => {
    const map = makeMap();
    render(<MapInsetsProvider><Host map={map} request={null} /></MapInsetsProvider>);
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("flies with the insets registered by children in the same commit", () => {
    const map = makeMap();
    render(
      <MapInsetsProvider>
        <Host map={map} request={{ id: 7, seq: 1 }}><Panel /></Host>
      </MapInsetsProvider>,
    );
    expect(map.flyTo).toHaveBeenCalledWith({
      center: [4.88, 52.36],
      zoom: 14,
      duration: 600,
      padding: { top: 0, right: 0, bottom: 0, left: 368 },
    });
  });

  it("re-flies when the same id is requested again (new seq)", () => {
    const map = makeMap();
    const { rerender } = render(<MapInsetsProvider><Host map={map} request={{ id: 7, seq: 1 }} /></MapInsetsProvider>);
    rerender(<MapInsetsProvider><Host map={map} request={{ id: 7, seq: 2 }} /></MapInsetsProvider>);
    expect(map.flyTo).toHaveBeenCalledTimes(2);
  });

  it("ignores an id that isn't in the list", () => {
    const map = makeMap();
    render(<MapInsetsProvider><Host map={map} request={{ id: 99, seq: 1 }} /></MapInsetsProvider>);
    expect(map.flyTo).not.toHaveBeenCalled();
  });
});
