import { describe, expect, it, vi } from "vitest";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Poi } from "../types/api";
import { buildPoiMiniCard, poiWebsiteHost } from "./PoiMiniCard";

const base: Poi = { id: 7, name: "Café Modern", address: "Street 12, Amsterdam", city: null, country_code: null, lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: "https://cafemodern.nl/menu", image_url: "https://img.test/a.jpg", source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0 };

describe("poiWebsiteHost", () => {
  it("returns the bare host for a valid website", () => {
    expect(poiWebsiteHost("https://cafemodern.nl/menu")).toBe("cafemodern.nl");
  });
  it("returns null for unsafe or empty input", () => {
    expect(poiWebsiteHost("javascript:alert(1)")).toBeNull();
    expect(poiWebsiteHost(null)).toBeNull();
  });
});

describe("buildPoiMiniCard", () => {
  it("renders name, website host and fires onOpen", async () => {
    const onOpen = vi.fn();
    const el = buildPoiMiniCard({ poi: base, tintColor: "#E1574C", pinned: true, onOpen });
    document.body.appendChild(el);
    const q = within(el);
    expect(q.getByText("Café Modern")).toBeInTheDocument();
    expect(q.getByText("cafemodern.nl")).toBeInTheDocument();
    await userEvent.click(q.getByRole("button", { name: /open/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it("shows +Stay/+Stop only when onAdd is provided and pinned", async () => {
    const onAdd = vi.fn();
    const el = buildPoiMiniCard({ poi: base, tintColor: "#E1574C", pinned: true, onAdd });
    document.body.appendChild(el);
    const q = within(el);
    await userEvent.click(q.getByRole("button", { name: /stay/i }));
    await userEvent.click(q.getByRole("button", { name: /stop/i }));
    expect(onAdd).toHaveBeenNthCalledWith(1, "stay");
    expect(onAdd).toHaveBeenNthCalledWith(2, "stop");
    el.remove();
  });

  it("hides action row and close on a transient card", () => {
    const el = buildPoiMiniCard({ poi: base, tintColor: "#E1574C", pinned: false, onAdd: () => {}, onClose: () => {} });
    document.body.appendChild(el);
    const q = within(el);
    expect(q.queryByRole("button", { name: /stay/i })).not.toBeInTheDocument();
    expect(q.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    el.remove();
  });

  it("degrades to name-only when photo and website are absent", () => {
    const el = buildPoiMiniCard({ poi: { ...base, website: null, image_url: null }, tintColor: "#888", pinned: true });
    document.body.appendChild(el);
    const q = within(el);
    expect(q.getByText("Café Modern")).toBeInTheDocument();
    expect(q.queryByText("cafemodern.nl")).not.toBeInTheDocument();
    el.remove();
  });

  it("neutralizes an unsafe image url (no url() injection)", () => {
    const el = buildPoiMiniCard({ poi: { ...base, image_url: "https://x/a.jpg\") ;background:red" }, tintColor: "#888", pinned: true });
    const thumb = el.querySelector("[data-testid='mini-thumb']") as HTMLElement;
    expect(thumb.style.backgroundImage).not.toContain("red");
    el.remove();
  });
});
