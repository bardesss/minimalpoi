import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { stubMediaQueries } from "../test/utils";
import { useIsMobile, useIsNarrowDesktop } from "./useMediaQuery";

let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; });

describe("breakpoint hooks", () => {
  it("useIsNarrowDesktop matches the 769–1279px query only", () => {
    restore = stubMediaQueries((q) => q === "(min-width: 769px) and (max-width: 1279px)");
    expect(renderHook(() => useIsNarrowDesktop()).result.current).toBe(true);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
  it("defaults to false under the jsdom stub", () => {
    expect(renderHook(() => useIsNarrowDesktop()).result.current).toBe(false);
  });
});
