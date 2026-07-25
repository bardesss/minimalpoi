import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ListToolbar from "./ListToolbar";

const noop = () => {};
const baseProps = {
  visited: "any" as const,
  onVisitedChange: noop,
  sortMode: "recent" as const,
  onSortChange: noop,
  viewMode: "fit" as const,
  onViewModeChange: noop,
};

describe("ListToolbar", () => {
  it("shows the filters inline plus the place count", () => {
    render(<ListToolbar {...baseProps} count={39} />);
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by visited/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /map view/i })).toBeInTheDocument();
    expect(screen.getByText("39 places")).toBeInTheDocument();
    // No popover trigger here — the filters are already visible inline.
    expect(screen.queryByRole("button", { name: /filters/i })).not.toBeInTheDocument();
  });

  it("omits the count when not provided", () => {
    render(<ListToolbar {...baseProps} />);
    expect(screen.queryByText(/places$/i)).not.toBeInTheDocument();
  });
});
