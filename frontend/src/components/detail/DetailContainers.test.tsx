import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Poi } from "../../types/api";
import { renderWithProviders } from "../../test/utils";
import { MapInsetsProvider, useMapInsetsReader } from "../../map/useMapInsets";
import type { Insets } from "../../map/mapInsets";
import DetailSheet from "./DetailSheet";
import SidebarDetail from "./SidebarDetail";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.37012, lng: 4.90011, category_id: 1, tags: [], notes: null, phone: "+31 20 300 1234", email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: null, rating_count: 0 };
const cat: Category = { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1 };
const noop = () => {};

describe("DetailSheet", () => {
  it("shows name, actions and header controls, and registers a detail-sheet inset at peek", () => {
    const out: { get?: () => Insets } = {};
    function Probe() { out.get = useMapInsetsReader(); return null; }
    renderWithProviders(<MapInsetsProvider><Probe /><DetailSheet poi={poi} category={cat} onClose={noop} onEdit={noop} onDelete={noop} /></MapInsetsProvider>);
    expect(screen.getByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /place actions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more actions/i })).toBeInTheDocument();
    expect(out.get!().bottom).toBeCloseTo(window.innerHeight * 0.28);
  });

  it("closes from the close button and on Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(<DetailSheet poi={poi} category={cat} onClose={onClose} onEdit={noop} onDelete={noop} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("SidebarDetail", () => {
  it("renders a Back to list header, the details and a footer with Edit", async () => {
    const onClose = vi.fn();
    renderWithProviders(<SidebarDetail poi={poi} category={cat} onClose={onClose} onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit place/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back to list/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("registers no map inset", () => {
    const out: { get?: () => Insets } = {};
    function Probe() { out.get = useMapInsetsReader(); return null; }
    renderWithProviders(<MapInsetsProvider><Probe /><SidebarDetail poi={poi} category={cat} onClose={noop} onEdit={noop} onDelete={noop} /></MapInsetsProvider>);
    expect(out.get!()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
});

const other: Poi = { ...poi, id: 2, name: "Other Place" };

async function armConfirm() {
  await userEvent.click(screen.getByRole("button", { name: /more actions/i }));
  await userEvent.click(screen.getByRole("menuitem", { name: /delete place/i }));
  expect(screen.getByText(/delete this place\?/i)).toBeInTheDocument();
}

describe.each([
  ["DetailSheet", DetailSheet],
  ["SidebarDetail", SidebarDetail],
] as const)("%s switching places", (_name, Container) => {
  const props = { category: cat, onClose: noop, onEdit: noop, onDelete: noop };

  it("drops an armed delete confirmation when another place is shown", async () => {
    const { rerender } = renderWithProviders(<Container poi={poi} {...props} />);
    await armConfirm();
    rerender(<Container poi={other} {...props} />);
    expect(screen.queryByText(/delete this place\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more actions/i })).toBeInTheDocument();
  });

  it("scrolls back to the top when another place is shown", () => {
    const { container, rerender } = renderWithProviders(<Container poi={poi} {...props} />);
    const scroller = container.querySelector(".poi-scroll") as HTMLElement;
    Object.defineProperty(scroller, "scrollTop", { value: 240, writable: true, configurable: true });
    act(() => { rerender(<Container poi={other} {...props} />); });
    expect(scroller.scrollTop).toBe(0);
  });
});

describe("DetailSheet peek summary", () => {
  it("clamps the name and address to one line each, keeping the full text as a title", () => {
    const long = { ...poi, name: "A very long place name that would otherwise wrap onto two lines", address: "Some Really Long Street Name 123, 1234 AB Amsterdam, Netherlands" };
    renderWithProviders(<DetailSheet poi={long} category={cat} onClose={noop} onEdit={noop} onDelete={noop} />);
    const name = screen.getByRole("heading", { name: long.name });
    expect(name.style.whiteSpace).toBe("nowrap");
    expect(name.style.textOverflow).toBe("ellipsis");
    expect(name.style.overflow).toBe("hidden");
    expect(name).toHaveAttribute("title", long.name);
    const address = screen.getByText(long.address, { exact: false });
    expect(address.style.whiteSpace).toBe("nowrap");
    expect(address.style.textOverflow).toBe("ellipsis");
    expect(address).toHaveAttribute("title", long.address);
  });

  it("does not clamp the summary in the sidebar detail", () => {
    renderWithProviders(<SidebarDetail poi={poi} category={cat} onClose={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole("heading", { name: poi.name }).style.whiteSpace).toBe("");
  });
});
