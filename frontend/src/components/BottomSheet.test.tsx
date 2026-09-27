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
});
