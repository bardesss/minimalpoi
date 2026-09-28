import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { flingSnap, useSheetDrag } from "./useSheetDrag";

afterEach(() => vi.restoreAllMocks());

function ev(clientY: number, target: Element = document.body) {
  return { clientY, pointerId: 1, target } as unknown as React.PointerEvent;
}

describe("flingSnap", () => {
  it("moves one snap in the fling direction above the threshold", () => {
    expect(flingSnap("half", -0.8)).toBe("full");
    expect(flingSnap("half", 0.8)).toBe("peek");
    expect(flingSnap("peek", -0.6)).toBe("half");
  });
  it("clamps at the ends and ignores slow releases", () => {
    expect(flingSnap("full", -2)).toBe("full");
    expect(flingSnap("peek", 2)).toBe("peek");
    expect(flingSnap("half", 0.3)).toBeNull();
  });
});

describe("useSheetDrag", () => {
  it("a quick short flick up opens one snap even though nearest-snap would stay", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("half"));
    const startRest = result.current.restTranslate;
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(500)));
    now.mockReturnValue(1040);
    act(() => result.current.handlers.onPointerMove(ev(460)));   // 40px in 40ms = 1 px/ms upward
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.restTranslate).toBeLessThan(startRest); // now "full"
    expect(result.current.restTranslate).toBeCloseTo(window.innerHeight * 0.1);
  });

  it("a slow drag of the same distance snaps to nearest (stays at half)", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("half"));
    const startRest = result.current.restTranslate;
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(500)));
    now.mockReturnValue(1400);
    act(() => result.current.handlers.onPointerMove(ev(460)));   // 0.1 px/ms
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.restTranslate).toBeCloseTo(startRest);
  });

  it("a fast full-length swipe from peek ends at full, not one snap short", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("peek"));
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(700)));
    now.mockReturnValue(1100);
    act(() => result.current.handlers.onPointerMove(ev(450)));
    now.mockReturnValue(1200);
    act(() => result.current.handlers.onPointerMove(ev(200)));   // 500px in 200ms
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.restTranslate).toBeCloseTo(window.innerHeight * 0.1);
  });

  it("a flick followed by a hold before release snaps to nearest", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("half"));
    const startRest = result.current.restTranslate;
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(500)));
    now.mockReturnValue(1040);
    act(() => result.current.handlers.onPointerMove(ev(460)));   // fast...
    now.mockReturnValue(1340);
    act(() => result.current.handlers.onPointerUp());             // ...then held 300ms
    expect(result.current.restTranslate).toBeCloseTo(startRest);
  });

  it("a long fast swipe that already passed the flung snap keeps the further one (nearest wins)", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("peek"));
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(700)));
    now.mockReturnValue(1050);
    // 650px up in 50ms: far enough to clamp the drag at "full" already, and
    // fast enough that flingSnap("peek", …) only reaches "half" — the nearest
    // snap (full) is further than the flung one, so it must win.
    act(() => result.current.handlers.onPointerMove(ev(50)));
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.restTranslate).toBeCloseTo(window.innerHeight * 0.1);
  });

  it("a slow long drag settles on the nearest snap, not one step from the start", () => {
    const now = vi.spyOn(performance, "now");
    const { result } = renderHook(() => useSheetDrag("full"));
    now.mockReturnValue(1000);
    act(() => result.current.handlers.onPointerDown(ev(100)));
    now.mockReturnValue(1800);
    // A single slow move (800ms) lands the drag right at "peek"; the release
    // window (80ms) only sees this one sample, so velocity is 0 and no fling
    // applies — it must settle on the nearest snap (peek), two away from full.
    act(() => result.current.handlers.onPointerMove(ev(100 + window.innerHeight * 0.62)));
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.restTranslate).toBeCloseTo(window.innerHeight * 0.72);
  });

  it("ignores pointer-downs on controls inside the handle", () => {
    const { result } = renderHook(() => useSheetDrag("half"));
    const startRest = result.current.restTranslate;
    const btn = document.createElement("button");
    act(() => result.current.handlers.onPointerDown(ev(500, btn)));
    act(() => result.current.handlers.onPointerUp());             // would be a "tap" → cycle
    expect(result.current.dragging).toBe(false);
    expect(result.current.restTranslate).toBeCloseTo(startRest);
  });
});
