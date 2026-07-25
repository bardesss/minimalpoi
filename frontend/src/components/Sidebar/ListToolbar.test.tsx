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
  it("renders a filter trigger and no inline count", async () => {
    render(<ListToolbar {...baseProps} />);
    expect(screen.queryByText(/places$/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
  });
});
