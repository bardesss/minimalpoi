import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExportMenu from "./ExportMenu";

describe("ExportMenu", () => {
  it("opens on click and focuses the first item", async () => {
    render(<ExportMenu onExport={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: "GeoJSON" })).toHaveFocus();
  });

  it("moves focus with ArrowDown/ArrowUp and wraps", async () => {
    render(<ExportMenu onExport={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "GPX" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "KML" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}"); // wraps to first
    expect(screen.getByRole("menuitem", { name: "GeoJSON" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}"); // wraps to last
    expect(screen.getByRole("menuitem", { name: "KML" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<ExportMenu onExport={() => {}} />);
    const trigger = screen.getByRole("button", { name: /export/i });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("selects a format with Enter, calls onExport, and closes", async () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    await userEvent.keyboard("{ArrowDown}{Enter}"); // move to GPX, activate
    expect(onExport).toHaveBeenCalledWith("gpx");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens with ArrowDown from the trigger and focuses the first item", async () => {
    render(<ExportMenu onExport={() => {}} />);
    const trigger = screen.getByRole("button", { name: /export/i });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "GeoJSON" })).toHaveFocus();
  });
});
