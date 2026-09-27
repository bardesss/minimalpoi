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
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 300, pointerId: 1 });
    expect(out.get!().bottom).toBe(before);
    fireEvent.pointerUp(handle, { clientY: 300, pointerId: 1 });
    // A 100px upward drag from "half" settles nearer "half" or "full"; either
    // way the inset now reflects a settled snap, not the finger position.
    const snaps = [0.52, 0.9].map((f) => window.innerHeight * f);
    expect(snaps.some((s) => Math.abs(s - out.get!().bottom) < 0.5)).toBe(true);
  });
});
