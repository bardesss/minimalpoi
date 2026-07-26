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
    const el = buildPoiMiniCard({ poi: base, color: "#E1574C", pinned: true, onOpen });
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
    const el = buildPoiMiniCard({ poi: base, color: "#E1574C", pinned: true, onAdd });
    document.body.appendChild(el);
    const q = within(el);
    await userEvent.click(q.getByRole("button", { name: /stay/i }));
    await userEvent.click(q.getByRole("button", { name: /stop/i }));
    expect(onAdd).toHaveBeenNthCalledWith(1, "stay");
    expect(onAdd).toHaveBeenNthCalledWith(2, "stop");
    el.remove();
  });

  it("hides action row and close on a transient card", () => {
    const el = buildPoiMiniCard({ poi: base, color: "#E1574C", pinned: false, onAdd: () => {}, onClose: () => {} });
    document.body.appendChild(el);
    const q = within(el);
    expect(q.queryByRole("button", { name: /stay/i })).not.toBeInTheDocument();
    expect(q.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    el.remove();
  });

  it("degrades to name-only (no image band) when photo and website are absent", () => {
    const el = buildPoiMiniCard({ poi: { ...base, website: null, image_url: null }, color: "#888", pinned: true });
    document.body.appendChild(el);
    const q = within(el);
    expect(q.getByText("Café Modern")).toBeInTheDocument();
    expect(q.queryByText("cafemodern.nl")).not.toBeInTheDocument();
    expect(el.querySelector("[data-testid='mini-thumb']")).toBeNull();
    el.remove();
  });

  it("drops the image band for an unsafe image url (no url() injection)", () => {
    const el = buildPoiMiniCard({ poi: { ...base, image_url: "https://x/a.jpg\") ;background:red" }, color: "#888", pinned: true });
    // An unsafe url is treated as no image: the band is not rendered at all,
    // so there is no url() token to break out of.
    expect(el.querySelector("[data-testid='mini-thumb']")).toBeNull();
    el.remove();
  });

  it("scales close and action buttons to ≥44px tap target on bigTap", () => {
    const onClose = vi.fn();
    const onAdd = vi.fn();
    const onOpen = vi.fn();
    const el = buildPoiMiniCard({ poi: base, color: "#E1574C", pinned: true, onClose, onAdd, onOpen, bigTap: true });
    document.body.appendChild(el);
    const q = within(el);
    const closeBtn = q.getByRole("button", { name: /close/i });
    const openBtn = q.getByRole("button", { name: /open/i });
    expect(closeBtn.style.width).toBe("44px");
    expect(closeBtn.style.height).toBe("44px");
    expect(openBtn.style.minHeight).toBe("44px");
    el.remove();
  });
});
