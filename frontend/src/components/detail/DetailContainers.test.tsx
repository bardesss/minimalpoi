import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
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
