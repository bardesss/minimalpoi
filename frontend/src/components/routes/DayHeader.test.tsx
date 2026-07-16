import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DayHeader from "./DayHeader";

const base = { label: "THU 16 JUL", dayNumber: 3, distance_m: 232000, duration_s: 16080, muted: false, stopCount: 3 };

describe("DayHeader", () => {
  it("shows the Day N marker", () => {
    render(<DayHeader {...base} collapsed={false} onToggle={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("shows the stop count only when collapsed", () => {
    const { rerender } = render(<DayHeader {...base} collapsed onToggle={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/3 stops/)).toBeInTheDocument();
    rerender(<DayHeader {...base} collapsed={false} onToggle={() => {}} onNavigate={() => {}} />);
    expect(screen.queryByText(/3 stops/)).not.toBeInTheDocument();
  });

  it("fires onToggle when the day header is clicked", async () => {
    const onToggle = vi.fn();
    render(<DayHeader {...base} collapsed={false} onToggle={onToggle} onNavigate={() => {}} />);
    // ^THU anchors to the toggle button; the Navigate button is "Navigate THU 16 JUL".
    await userEvent.click(screen.getByRole("button", { name: /^THU 16 JUL/ }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("fires onNavigate — not onToggle — when navigate is clicked", async () => {
    const onToggle = vi.fn();
    const onNavigate = vi.fn();
    render(<DayHeader {...base} collapsed={false} onToggle={onToggle} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("button", { name: /navigate/i }));
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
