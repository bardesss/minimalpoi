import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "./FilterBar";

describe("FilterBar", () => {
  it("renders the visited segmented control with the active option pressed", () => {
    render(<FilterBar value="visited" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Visited" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Not visited" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fires onChange with the chosen filter", async () => {
    const onChange = vi.fn();
    render(<FilterBar value="any" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Visited" }));
    expect(onChange).toHaveBeenCalledWith("visited");
    await userEvent.click(screen.getByRole("button", { name: "Not visited" }));
    expect(onChange).toHaveBeenCalledWith("not");
  });
});
