import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BottomSheet from "./BottomSheet";
import { MapInsetsProvider, useMapInsetsReader } from "../map/useMapInsets";
import type { Insets } from "../map/mapInsets";

function Probe({ out }: { out: { get?: () => Insets } }) {
  out.get = useMapInsetsReader();
  return null;
}

describe("BottomSheet", () => {
  it("renders headerRight content in the handle row alongside the grip", () => {
    render(
      <BottomSheet label="Places" headerRight={<span>40 places</span>}>
        <div>CONTENT</div>
      </BottomSheet>,
    );
    expect(screen.getByText("40 places")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });

  it("renders no extra header content when headerRight is omitted", () => {
    render(
      <BottomSheet label="Places">
        <div>CONTENT</div>
      </BottomSheet>,
    );
    expect(screen.queryByText(/places/i)).not.toBeInTheDocument();
  });

  it("registers the visible sheet height as a bottom inset", () => {
    const out: { get?: () => Insets } = {};
    render(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet label="Places" initial="half"><div>CONTENT</div></BottomSheet>
      </MapInsetsProvider>,
    );
    // "half" hides 48% of the viewport, so 52% is visible.
    expect(out.get!().bottom).toBeCloseTo(window.innerHeight * 0.52);
  });

  it("keeps the inset stable mid-drag and updates it when a snap settles", () => {
    const out: { get?: () => Insets } = {};
    render(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet label="Places" initial="half"><div>CONTENT</div></BottomSheet>
      </MapInsetsProvider>,
    );
    const handle = screen.getByRole("separator", { name: /drag to resize/i });
    const before = out.get!().bottom;
    // Drag well past "full" so the release can only settle there.
    fireEvent.pointerDown(handle, { clientY: 600, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 100, pointerId: 1 });
    expect(out.get!().bottom).toBe(before);
    fireEvent.pointerUp(handle, { clientY: 100, pointerId: 1 });
    // The inset now reflects the settled snap ("full" shows 90% of the
    // viewport), not the finger position.
    expect(out.get!().bottom).not.toBeCloseTo(before);
    expect(out.get!().bottom).toBeCloseTo(window.innerHeight * 0.9);
  });

  it("registers under a custom inset key and none while hidden", () => {
    const out: { get?: () => Insets } = {};
    const { rerender } = render(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet label="Details" initial="peek" insetKey="detail-sheet"><div>X</div></BottomSheet>
      </MapInsetsProvider>,
    );
    expect(out.get!().bottom).toBeCloseTo(window.innerHeight * 0.28);
    rerender(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet label="Details" initial="peek" insetKey="detail-sheet" hidden><div>X</div></BottomSheet>
      </MapInsetsProvider>,
    );
    expect(out.get!().bottom).toBe(0);
  });

  it("is invisible and inert while hidden", () => {
    render(<BottomSheet label="Places" hidden><button>inside</button></BottomSheet>);
    const section = screen.getByText("inside").closest("section")!;
    expect(section.style.visibility).toBe("hidden");
    expect(section).toHaveAttribute("inert");
  });

  it("uses a custom handle label", () => {
    render(<BottomSheet label="Details" handleLabel="Drag to resize details"><div /></BottomSheet>);
    expect(screen.getByRole("separator", { name: "Drag to resize details" })).toBeInTheDocument();
  });

  it("renders headerLeft content in the handle row", () => {
    render(<BottomSheet label="Places" headerLeft={<span>NAV</span>}><div>CONTENT</div></BottomSheet>);
    const nav = screen.getByText("NAV");
    expect(nav.closest('[role="separator"]')).not.toBeNull();
  });
});
