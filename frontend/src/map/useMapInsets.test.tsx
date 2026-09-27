import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import type { Map as MlMap } from "maplibre-gl";
import { useEffect, useState } from "react";
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
  const handlers: Record<string, Set<() => void>> = {};
  let padding = { top: 0, right: 0, bottom: 0, left: 0 };
  let moving = false;
  const size = { clientWidth: 1000, clientHeight: 800 };
  // When set, the next easeTo is "interrupted" part-way: the padding only
  // gets this far, as when a gesture or flyTo stops the animation.
  let interruptAt: typeof padding | null = null;
  const map = {
    getContainer: () => size,
    getPadding: () => padding,
    setPadding: vi.fn((p) => { padding = p; }),
    easeTo: vi.fn((o: { padding: typeof padding }) => {
      padding = interruptAt ?? o.padding;
      interruptAt = null;
    }),
    isMoving: () => moving,
    on: vi.fn((evt: string, fn: () => void) => { (handlers[evt] ??= new Set()).add(fn); }),
    off: vi.fn((evt: string, fn: () => void) => { handlers[evt]?.delete(fn); }),
  };
  return {
    map: map as unknown as MlMap & typeof map,
    size,
    setMoving: (m: boolean) => { moving = m; },
    setPaddingDirect: (p: typeof padding) => { padding = p; },
    interruptNextEase: (p: typeof padding) => { interruptAt = p; },
    fire: (evt: string) => { handlers[evt]?.forEach((fn) => fn()); },
    listeners: (evt: string) => handlers[evt]?.size ?? 0,
  };
}

function MapHost({ map }: { map: MlMap }) {
  const [ref] = useState(() => ({ current: map }));
  useApplyMapInsets(ref);
  return null;
}

/** Let queued microtasks (the deferred padding update) run. */
const flush = () => act(async () => {});

describe("useApplyMapInsets", () => {
  it("sets the current padding instantly on mount", () => {
    const { map } = fakeMap();
    render(<MapInsetsProvider><Cover k="sheet" inset={{ bottom: 400 }} /><MapHost map={map} /></MapInsetsProvider>);
    expect(map.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 400, left: 0 });
  });

  it("sets padding instantly when the inset registrant renders after the map (real tree order)", async () => {
    const { map } = fakeMap();
    render(<MapInsetsProvider><MapHost map={map} /><Cover k="sheet" inset={{ bottom: 400 }} /></MapInsetsProvider>);
    await flush();
    expect(map.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 400, left: 0 });
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  it("eases to new padding when insets change while idle", async () => {
    const { map } = fakeMap();
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    await flush();
    expect(map.easeTo).toHaveBeenCalledWith({ padding: { top: 0, right: 0, bottom: 0, left: 368 }, duration: 250 });
  });

  it("defers the store-driven update past the current effect flush", async () => {
    const { map, setMoving } = fakeMap();
    // A later effect in the same commit starts a camera move (like the
    // selection flyTo); the padding change must not start its own ease first.
    function Flyer() {
      useEffect(() => { setMoving(true); }, []);
      return null;
    }
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /><Flyer /></MapInsetsProvider>);
    expect(map.easeTo).not.toHaveBeenCalled();
    await flush();
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  it("waits for moveend while the camera is moving, then applies", async () => {
    const { map, setMoving, fire } = fakeMap();
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    setMoving(true);
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    await flush();
    expect(map.easeTo).not.toHaveBeenCalled();
    setMoving(false);
    fire("moveend");
    await flush();
    expect(map.easeTo).toHaveBeenCalledTimes(1);
  });

  it("corrects padding left part-way by an interrupted ease on the next moveend", async () => {
    const { map, fire, interruptNextEase } = fakeMap();
    const { rerender } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    interruptNextEase({ top: 0, right: 0, bottom: 0, left: 150.37 });
    rerender(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    await flush();
    expect(map.easeTo).toHaveBeenCalledTimes(1);
    fire("moveend");
    await flush();
    expect(map.easeTo).toHaveBeenCalledTimes(2);
    expect(map.easeTo).toHaveBeenLastCalledWith({ padding: { top: 0, right: 0, bottom: 0, left: 368 }, duration: 250 });
  });

  it("does nothing on moveend when padding already matches within half a pixel", async () => {
    const { map, fire, setPaddingDirect } = fakeMap();
    render(<MapInsetsProvider><MapHost map={map} /><Cover k="panel" inset={{ left: 368 }} /></MapInsetsProvider>);
    await flush();
    setPaddingDirect({ top: 0.2, right: 0, bottom: 0, left: 367.7 });
    fire("moveend");
    await flush();
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  it("re-clamps the padding when the map container resizes", async () => {
    const { map, fire, size } = fakeMap();
    render(<MapInsetsProvider><MapHost map={map} /><Cover k="sheet" inset={{ bottom: 700 }} /></MapInsetsProvider>);
    await flush();
    expect(map.getPadding().bottom).toBe(680);
    size.clientHeight = 600;
    fire("resize");
    await flush();
    expect(map.easeTo).toHaveBeenLastCalledWith({ padding: { top: 0, right: 0, bottom: 480, left: 0 }, duration: 250 });
  });

  it("removes its map listeners on unmount", () => {
    const { map, listeners } = fakeMap();
    const { unmount } = render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    unmount();
    expect(listeners("moveend")).toBe(0);
    expect(listeners("resize")).toBe(0);
  });

  it("skips when the map already has the target padding", async () => {
    const { map } = fakeMap();
    render(<MapInsetsProvider><MapHost map={map} /></MapInsetsProvider>);
    await flush();
    expect(map.setPadding).not.toHaveBeenCalled();
    expect(map.easeTo).not.toHaveBeenCalled();
  });
});
