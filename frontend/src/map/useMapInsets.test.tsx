import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import type { Map as MlMap } from "maplibre-gl";
import { useState } from "react";
import type { Insets } from "./mapInsets";
import { MapInsetsProvider, useApplyMapInsets, useMapInset, useMapInsetsReader } from "./useMapInsets";

function Probe({ out }: { out: { get?: () => Insets } }) {
  out.get = useMapInsetsReader();
  return null;
}

function Cover({ k, inset }: { k: string; inset: Partial<Insets> | null }) {
  useMapInset(k, inset);
  return null;
}

describe("useMapInset + useMapInsetsReader", () => {
  it("registers while mounted and unregisters on unmount", () => {
    const out: { get?: () => Insets } = {};
    const { rerender } = render(
      <MapInsetsProvider><Probe out={out} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>,
    );
    expect(out.get!()).toEqual({ top: 0, right: 0, bottom: 0, left: 368 });
    rerender(<MapInsetsProvider><Probe out={out} /></MapInsetsProvider>);
    expect(out.get!().left).toBe(0);
  });

  it("updates in place when the inset value changes, and null unregisters", () => {
    const out: { get?: () => Insets } = {};
    const { rerender } = render(
      <MapInsetsProvider><Probe out={out} /><Cover k="sheet" inset={{ bottom: 400 }} /></MapInsetsProvider>,
    );
    rerender(<MapInsetsProvider><Probe out={out} /><Cover k="sheet" inset={{ bottom: 100 }} /></MapInsetsProvider>);
    expect(out.get!().bottom).toBe(100);
    rerender(<MapInsetsProvider><Probe out={out} /><Cover k="sheet" inset={null} /></MapInsetsProvider>);
    expect(out.get!().bottom).toBe(0);
  });

  it("is a harmless no-op without a provider", () => {
    const out: { get?: () => Insets } = {};
    render(<><Probe out={out} /><Cover k="panel" inset={{ left: 368 }} /></>);
    expect(out.get!()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
});

function fakeMap() {
  const handlers: Record<string, () => void> = {};
  let padding = { top: 0, right: 0, bottom: 0, left: 0 };
  let moving = false;
  const map = {
    getContainer: () => ({ clientWidth: 1000, clientHeight: 800 }),
    getPadding: () => padding,
    setPadding: vi.fn((p) => { padding = p; }),
    easeTo: vi.fn((o: { padding: typeof padding }) => { padding = o.padding; }),
    isMoving: () => moving,
    once: vi.fn((evt: string, fn: () => void) => { handlers[evt] = fn; }),
    off: vi.fn(),
  };
  return {
    map: map as unknown as MlMap & typeof map,
    setMoving: (m: boolean) => { moving = m; },
    fire: (evt: string) => { const fn = handlers[evt]; delete handlers[evt]; fn?.(); },
  };
}

function MapHost({ map }: { map: MlMap }) {
  const [ref] = useState(() => ({ current: map }));
  useApplyMapInsets(ref);
  return null;
}

describe("useApplyMapInsets", () => {
  it("sets the current padding instantly on mount", () => {
    const { map } = fakeMap();
    render(<MapInsetsProvider><Cover k="sheet" inset={{ bottom: 400 }} /><MapHost map={map} /></MapInsetsProvider>);
    expect(map.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 400, left: 0 });
  });

  it("eases to new padding when insets change while idle", () => {
    const { map } = fakeMap();
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    expect(map.easeTo).toHaveBeenCalledWith({ padding: { top: 0, right: 0, bottom: 0, left: 368 }, duration: 250 });
  });

  it("waits for moveend while the camera is moving, then applies", () => {
    const { map, setMoving, fire } = fakeMap();
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    setMoving(true);
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    expect(map.easeTo).not.toHaveBeenCalled();
    setMoving(false);
    act(() => fire("moveend"));
    expect(map.easeTo).toHaveBeenCalledTimes(1);
  });

  it("skips when the map already has the target padding", () => {
    const { map } = fakeMap();
    render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    expect(map.setPadding).not.toHaveBeenCalled();
    expect(map.easeTo).not.toHaveBeenCalled();
  });
});
