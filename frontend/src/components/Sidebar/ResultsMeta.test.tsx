import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsMeta from "./ResultsMeta";

const noop = () => {};

describe("ResultsMeta", () => {
  it("shows the count and reflects the active view mode", () => {
    render(<ResultsMeta count={3} viewMode="fit" onViewModeChange={noop} sortMode="recent" onSortChange={noop} />);
    expect(screen.getByText("3 places shown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "false");
  });

  it("uses the singular for a single place", () => {
    render(<ResultsMeta count={1} viewMode="center" onViewModeChange={noop} sortMode="recent" onSortChange={noop} />);
    expect(screen.getByText("1 place shown")).toBeInTheDocument();
  });

  it("calls onViewModeChange when a mode is clicked", async () => {
    const onChange = vi.fn();
    render(<ResultsMeta count={2} viewMode="center" onViewModeChange={onChange} sortMode="recent" onSortChange={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(onChange).toHaveBeenCalledWith("fit");
  });

  it("reflects and changes the sort mode", async () => {
    const onSort = vi.fn();
    render(<ResultsMeta count={2} viewMode="center" onViewModeChange={noop} sortMode="recent" onSortChange={onSort} />);
    const select = screen.getByRole("combobox", { name: /sort places/i }) as HTMLSelectElement;
    expect(select.value).toBe("recent");
    await userEvent.selectOptions(select, "distance");
    expect(onSort).toHaveBeenCalledWith("distance");
  });
});
