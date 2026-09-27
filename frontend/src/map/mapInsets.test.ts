import { describe, expect, it, vi } from "vitest";
import type { Map as MlMap } from "maplibre-gl";
import { clampInsets, containerCenter, createInsetsStore, paddingFor, sameInsets, ZERO_INSETS } from "./mapInsets";

describe("createInsetsStore", () => {
  it("starts at zero", () => {
    expect(createInsetsStore().get()).toEqual(ZERO_INSETS);
  });

  it("sums insets per side across keys", () => {
    const s = createInsetsStore();
    s.set("sheet", { bottom: 400 });
    s.set("panel", { left: 368, bottom: 10 });
    expect(s.get()).toEqual({ top: 0, right: 0, bottom: 410, left: 368 });
  });

  it("replaces a key's inset and removes it with null", () => {
    const s = createInsetsStore();
    s.set("sheet", { bottom: 400 });
    s.set("sheet", { bottom: 100 });
    expect(s.get().bottom).toBe(100);
    s.set("sheet", null);
    expect(s.get()).toEqual(ZERO_INSETS);
  });

  it("notifies subscribers only when the total changes", () => {
    const s = createInsetsStore();
    const fn = vi.fn();
    const unsub = s.subscribe(fn);
    s.set("sheet", { bottom: 400 });
    s.set("sheet", { bottom: 400 });
    s.set("missing", null);
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    s.set("sheet", null);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("sameInsets", () => {
  it("compares all four sides", () => {
    expect(sameInsets({ top: 1, right: 2, bottom: 3, left: 4 }, { top: 1, right: 2, bottom: 3, left: 4 })).toBe(true);
    expect(sameInsets({ top: 1, right: 2, bottom: 3, left: 4 }, { top: 1, right: 2, bottom: 3, left: 5 })).toBe(false);
  });
});

describe("clampInsets", () => {
  it("leaves insets that fit untouched", () => {
    expect(clampInsets({ top: 0, right: 0, bottom: 400, left: 0 }, 375, 812)).toEqual({ top: 0, right: 0, bottom: 400, left: 0 });
  });

  it("keeps at least 120px visible vertically, trimming bottom first", () => {
    expect(clampInsets({ top: 0, right: 0, bottom: 731, left: 0 }, 375, 812)).toEqual({ top: 0, right: 0, bottom: 692, left: 0 });
    expect(clampInsets({ top: 100, right: 0, bottom: 731, left: 0 }, 375, 812)).toEqual({ top: 100, right: 0, bottom: 592, left: 0 });
  });

  it("keeps at least 120px visible horizontally, trimming right first", () => {
    expect(clampInsets({ top: 0, right: 500, bottom: 0, left: 368 }, 544, 768)).toEqual({ top: 0, right: 56, bottom: 0, left: 368 });
  });

  it("never returns negatives on a tiny or zero-size container", () => {
    expect(clampInsets({ top: 50, right: 50, bottom: 50, left: 50 }, 0, 0)).toEqual(ZERO_INSETS);
  });
});

function fakeMap(width: number, height: number) {
  return {
    getContainer: () => ({ clientWidth: width, clientHeight: height }),
    unproject: vi.fn(([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 })),
  } as unknown as MlMap & { unproject: ReturnType<typeof vi.fn> };
}

describe("paddingFor", () => {
  it("clamps against the map container size", () => {
    expect(paddingFor(fakeMap(375, 812), { top: 0, right: 0, bottom: 900, left: 0 }).bottom).toBe(692);
  });

  it("rounds to whole pixels so an eased padding can settle on it exactly", () => {
    expect(paddingFor(fakeMap(375, 812), { top: 0.4, right: 0, bottom: 422.24, left: 10.5 })).toEqual({ top: 0, right: 0, bottom: 422, left: 11 });
  });
});

describe("containerCenter", () => {
  it("unprojects the container's centre pixel (ignoring padding)", () => {
    const map = fakeMap(400, 800);
    expect(containerCenter(map)).toEqual({ lng: 2, lat: 4 });
    expect(map.unproject).toHaveBeenCalledWith([200, 400]);
  });
});
