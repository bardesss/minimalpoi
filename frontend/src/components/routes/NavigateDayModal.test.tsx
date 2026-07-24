import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavigateDayModal from "./NavigateDayModal";
import type { Waypoint } from "../../lib/routeNav";

const waypoints: Waypoint[] = [
  { name: "Home", lat: 52, lng: 4 },
  { name: "Bed", lat: 53, lng: 5 },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("NavigateDayModal", () => {
  it("opens Google Maps in a new tab and closes", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const onClose = vi.fn();
    render(<NavigateDayModal dayLabel="THU 16 JUL" waypoints={waypoints} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /google maps/i }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("google.com/maps/dir/"), "_blank", "noopener");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("copies coordinates to the clipboard and closes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onClose = vi.fn();
    render(<NavigateDayModal dayLabel="THU 16 JUL" waypoints={waypoints} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /copy coordinates/i }));
    expect(writeText).toHaveBeenCalledWith("1. Home\n52,4\n2. Bed\n53,5");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(<NavigateDayModal dayLabel="THU 16 JUL" waypoints={waypoints} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("navmodal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<NavigateDayModal dayLabel="THU 16 JUL" waypoints={waypoints} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  // On mobile the timeline lives inside a `transform`ed bottom sheet, which
  // would trap a `position: fixed` overlay inside the sheet. Portalling to
  // <body> escapes that containing block so the modal covers the viewport.
  it("renders into document.body, outside any transformed ancestor", () => {
    const { container } = render(
      <div style={{ transform: "translateY(100px)" }}>
        <NavigateDayModal dayLabel="THU 16 JUL" waypoints={waypoints} onClose={vi.fn()} />
      </div>,
    );
    const backdrop = screen.getByTestId("navmodal-backdrop");
    expect(container.contains(backdrop)).toBe(false);
    expect(document.body.contains(backdrop)).toBe(true);
  });
});
