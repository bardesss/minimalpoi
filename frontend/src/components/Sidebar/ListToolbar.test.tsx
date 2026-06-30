import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListToolbar from "./ListToolbar";

const noop = () => {};
const baseProps = {
  count: 3,
  visited: "any" as const,
  onVisitedChange: noop,
  sortMode: "recent" as const,
  onSortChange: noop,
  viewMode: "fit" as const,
  onViewModeChange: noop,
};

describe("ListToolbar", () => {
  it("shows the count and reflects the active view mode", () => {
    render(<ListToolbar {...baseProps} />);
    expect(screen.getByText("3 places")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "false");
  });

  it("uses the singular for a single place", () => {
    render(<ListToolbar {...baseProps} count={1} />);
    expect(screen.getByText("1 place")).toBeInTheDocument();
  });

  it("calls onViewModeChange when a mode is clicked", async () => {
    const onChange = vi.fn();
    render(<ListToolbar {...baseProps} viewMode="center" onViewModeChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(onChange).toHaveBeenCalledWith("fit");
  });

  it("reflects and changes the sort mode", async () => {
    const onSort = vi.fn();
    render(<ListToolbar {...baseProps} onSortChange={onSort} />);
    const select = screen.getByRole("combobox", { name: /sort places/i }) as HTMLSelectElement;
    expect(select.value).toBe("recent");
    await userEvent.selectOptions(select, "distance");
    expect(onSort).toHaveBeenCalledWith("distance");
  });

  it("reflects and changes the visited filter", async () => {
    const onVisited = vi.fn();
    render(<ListToolbar {...baseProps} visited="visited" onVisitedChange={onVisited} />);
    const select = screen.getByRole("combobox", { name: /filter by visited/i }) as HTMLSelectElement;
    expect(select.value).toBe("visited");
    await userEvent.selectOptions(select, "not");
    expect(onVisited).toHaveBeenCalledWith("not");
  });
});
