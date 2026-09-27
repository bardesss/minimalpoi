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
