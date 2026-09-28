import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CATEGORY_ICONS, CategoryIcon } from "./categoryIcon";

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
    vi.resetModules();
    const { CategoryIcon: FreshCategoryIcon } = await import("./categoryIcon");
    const { container } = render(<FreshCategoryIcon name="anchor" />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector("svg.lucide-anchor")).toBeInTheDocument();
    });
  });

  it("stays on the pin svg for an unknown name even after the full set loads", async () => {
    vi.resetModules();
    const { CategoryIcon: FreshCategoryIcon } = await import("./categoryIcon");
    const { container } = render(<FreshCategoryIcon name="totally-not-a-real-icon" />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    // give the lazily-loaded full icon set a chance to resolve; it should not
    // find a match for this name and MapPin should remain.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await waitFor(() => {
      expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
    });
  });
});
