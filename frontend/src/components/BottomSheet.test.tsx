import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BottomSheet from "./BottomSheet";
import MenuButton from "./MenuButton";
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
    const handle = screen.getByTestId("sheet-handle");
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
    expect(nav.closest('[data-testid="sheet-handle"]')).not.toBeNull();
  });

  it("labels only the grip as the separator, so the handle row's controls stay exposed", () => {
    render(<BottomSheet label="Places" headerRight={<button>Acct</button>}><div /></BottomSheet>);
    const row = screen.getByTestId("sheet-handle");
    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("aria-label");
    const grip = screen.getByRole("separator", { name: "Drag to resize list" });
    expect(row).toContainElement(grip);
    expect(grip).not.toContainElement(screen.getByRole("button", { name: "Acct" }));
  });

  it("stacks the handle row above the content and positions the slots without transforms", () => {
    render(<BottomSheet label="Places" headerLeft={<span>L</span>} headerRight={<span>R</span>}><div /></BottomSheet>);
    expect(screen.getByTestId("sheet-handle").style.zIndex).toBe("1");
    for (const text of ["L", "R"]) {
      const slot = screen.getByText(text).parentElement as HTMLElement;
      expect(slot.style.transform).toBe("");
      expect(slot.style.top).toBe("0px");
      expect(slot.style.bottom).toBe("0px");
      expect(slot.style.display).toBe("flex");
      expect(slot.style.alignItems).toBe("center");
    }
  });

  it("tapping the open menu's backdrop in a header slot closes it without moving the sheet", () => {
    const out: { get?: () => Insets } = {};
    render(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet
          label="Places"
          initial="half"
          headerRight={<MenuButton label="A" ariaLabel="Acct" menuLabel="Account" items={[{ key: "x", label: "X", onSelect: () => {} }]} />}
        >
          <div>CONTENT</div>
        </BottomSheet>
      </MapInsetsProvider>,
    );
    const before = out.get!().bottom;
    fireEvent.click(screen.getByRole("button", { name: "Acct" }));
    const backdrop = screen.getByRole("menu").previousElementSibling as HTMLElement;
    fireEvent.pointerDown(backdrop, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(backdrop, { clientY: 300, pointerId: 1 });
    fireEvent.click(backdrop);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(out.get!().bottom).toBe(before);
  });

  it("tapping non-button content in a header slot does not cycle the snap", () => {
    const out: { get?: () => Insets } = {};
    render(
      <MapInsetsProvider>
        <Probe out={out} />
        <BottomSheet label="Places" initial="half" headerRight={<span>40 places</span>}><div /></BottomSheet>
      </MapInsetsProvider>,
    );
    const before = out.get!().bottom;
    const badge = screen.getByText("40 places");
    fireEvent.pointerDown(badge, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(badge, { clientY: 300, pointerId: 1 });
    expect(out.get!().bottom).toBe(before);
    // A tap on the handle row itself still cycles.
    const row = screen.getByTestId("sheet-handle");
    fireEvent.pointerDown(row, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(row, { clientY: 300, pointerId: 1 });
    expect(out.get!().bottom).not.toBe(before);
  });
});
