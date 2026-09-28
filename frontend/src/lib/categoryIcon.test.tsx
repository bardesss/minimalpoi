import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { CATEGORY_ICONS, CategoryIcon } from "./categoryIcon";

// The real full-icon module cold-loads ~1,850 files under vitest (seconds),
// which is irrelevant to what these tests check. Stub it with a single icon so
// the lazy mechanism is exercised without the heavy load.
const ICON_INDEX = "lucide-react/dist/esm/icons/index.mjs";
const stubIconIndex = vi.hoisted(() => async () => {
  const { Anchor } = await import("lucide-react");
  return { Anchor };
});
vi.mock("lucide-react/dist/esm/icons/index.mjs", stubIconIndex);

async function freshCategoryIcon() {
  vi.resetModules();
  return (await import("./categoryIcon")).CategoryIcon;
}

describe("CATEGORY_ICONS", () => {
  it("exposes the curated picker names built from named lucide imports", () => {
    expect(Object.keys(CATEGORY_ICONS)).toEqual([
      "utensils", "coffee", "beer", "wine", "bed", "tree-pine", "mountain", "camera",
      "landmark", "store", "shopping-cart", "fuel", "parking-circle", "bike",
      "train-front", "plane", "ship", "music", "film", "dumbbell", "heart", "star",
      "flag", "map-pin",
    ]);
  });
});

describe("CategoryIcon", () => {
  it("renders a curated icon synchronously", () => {
    const { container } = render(<CategoryIcon name="utensils" />);
    expect(container.querySelector("svg.lucide-utensils")).toBeInTheDocument();
  });

  it("falls back to a pin svg for null", () => {
    const { container } = render(<CategoryIcon name={null} />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
  });

  it("renders MapPin first, then swaps in a non-curated icon once the full set loads", async () => {
    const FreshCategoryIcon = await freshCategoryIcon();
    const { container } = render(<FreshCategoryIcon name="anchor" />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector("svg.lucide-anchor")).toBeInTheDocument();
    });
  });

  it("stays on the pin svg for an unknown name even after the full set loads", async () => {
    vi.resetModules();
    const mod = await import("./categoryIcon");
    const { container } = render(<mod.CategoryIcon name="totally-not-a-real-icon" />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    // Wait for the (stubbed) full set to actually load, then check MapPin stays.
    let index: object = {};
    await act(async () => {
      index = await import(ICON_INDEX);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(Object.keys(index)).toContain("Anchor");
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it.each(["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"])(
    "renders MapPin, without throwing, for the Object.prototype name %s",
    async (name) => {
      const FreshCategoryIcon = await freshCategoryIcon();
      const { container } = render(<FreshCategoryIcon name={name} />);
      expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
      // ...and still after the full set has loaded (the lazy lookup is guarded too).
      await act(async () => {
        await import(ICON_INDEX);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    },
  );

  it("swallows a failed full-set load and retries it on a later mount", async () => {
    // First load fails (e.g. a stale chunk 404 after a deploy), later ones succeed.
    let loads = 0;
    vi.doMock(ICON_INDEX, async () => {
      loads += 1;
      if (loads === 1) throw new Error("chunk failed to load");
      return stubIconIndex();
    });
    try {
      const FreshCategoryIcon = await freshCategoryIcon();
      const first = render(<FreshCategoryIcon name="anchor" />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(loads).toBe(1);
      expect(first.container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
      first.unmount();

      const second = render(<FreshCategoryIcon name="anchor" />);
      await waitFor(() => {
        expect(second.container.querySelector("svg.lucide-anchor")).toBeInTheDocument();
      });
      expect(loads).toBe(2);
    } finally {
      vi.doMock(ICON_INDEX, stubIconIndex);
    }
  });
});
