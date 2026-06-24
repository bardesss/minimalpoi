// frontend/src/components/Legend.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Category } from "../types/api";
import Legend from "./Legend";

const cats: Category[] = [
  { id: 1, name: "Restaurants", color: "#E1574C", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" },
  { id: 2, name: "Nature", color: "#2F9E63", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" },
];

describe("Legend", () => {
  it("renders a row + count per category", () => {
    render(<Legend categories={cats} counts={{ 1: 3, 2: 0 }} />);
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Nature")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
