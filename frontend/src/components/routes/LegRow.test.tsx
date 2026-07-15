import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LegRow from "./LegRow";
import type { RouteLeg } from "../../types/api";

const base: RouteLeg = { from_node_id: 1, to_node_id: 2, distance_m: 28000, duration_s: 2100, source: "estimate", geometry: null };

describe("LegRow", () => {
  it("shows the est. pill for an estimated leg", () => {
    render(<LegRow leg={base} />);
    expect(screen.getByText("28 km · 35 min")).toBeInTheDocument();
    expect(screen.getByText(/est\./i)).toBeInTheDocument();
  });
  it("hides the est. pill for a google leg", () => {
    render(<LegRow leg={{ ...base, source: "google" }} />);
    expect(screen.queryByText(/est\./i)).not.toBeInTheDocument();
  });
});
