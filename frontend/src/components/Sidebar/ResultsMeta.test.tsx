import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsMeta from "./ResultsMeta";

describe("ResultsMeta", () => {
  it("shows the count and reflects the active view mode", () => {
    render(<ResultsMeta count={3} viewMode="fit" onViewModeChange={() => {}} />);
    expect(screen.getByText("3 places shown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "false");
  });

  it("uses the singular for a single place", () => {
    render(<ResultsMeta count={1} viewMode="center" onViewModeChange={() => {}} />);
    expect(screen.getByText("1 place shown")).toBeInTheDocument();
  });

  it("calls onViewModeChange when a mode is clicked", async () => {
    const onChange = vi.fn();
    render(<ResultsMeta count={2} viewMode="center" onViewModeChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(onChange).toHaveBeenCalledWith("fit");
  });
});
