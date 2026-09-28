import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSidebarWidth } from "./layout";
import { stubMediaQueries } from "../test/utils";

describe("useSidebarWidth", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("is 480 by default", () => {
    const { result } = renderHook(() => useSidebarWidth());
    expect(result.current).toBe(480);
  });

  it("is 640 on very wide viewports", () => {
    restore = stubMediaQueries((q) => q === "(min-width: 1600px)");
    const { result } = renderHook(() => useSidebarWidth());
    expect(result.current).toBe(640);
  });
});
