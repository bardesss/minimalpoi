import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("desktop: shows the filters inline plus the place count", () => {
    render(<ListToolbar {...baseProps} count={39} />);
    // Controls are visible without opening anything, and there is no popover trigger.
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by visited/i)).toBeInTheDocument();
    expect(screen.getByText("39 places")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /filters/i })).not.toBeInTheDocument();
  });

  it("mobile: collapses the filters behind a trigger and shows no inline count", async () => {
    render(<ListToolbar {...baseProps} count={39} mobile />);
    expect(screen.queryByText(/places$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sort places/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
  });
});
