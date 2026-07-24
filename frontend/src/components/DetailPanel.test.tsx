import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Poi } from "../types/api";
import { renderWithProviders } from "../test/utils";
import DetailPanel from "./DetailPanel";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.37012, lng: 4.90011, category_id: 1, tags: ["popular", "outdoor"], notes: "Nice spot", phone: "+31 20 300 1234", email: "info@place.nl", website: "https://place.nl", image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "s", avg_rating: null, rating_count: 0 };
const cat: Category = { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1, trip_category_id: null, trip_sync_status: "s" };

describe("DetailPanel", () => {
  it("renders fields, tags and the website link", () => {
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    expect(screen.getByText(/52.37012/)).toBeInTheDocument();
    expect(screen.getByText("popular")).toBeInTheDocument();
    const websiteLink = screen.getAllByRole("link").find((link) => link.textContent === "place.nl");
    expect(websiteLink).toHaveAttribute("href", "https://place.nl");
  });

  it("renders a javascript: website as plain text, not a link (stored-XSS guard)", () => {
    renderWithProviders(<DetailPanel poi={{ ...poi, website: "javascript:alert(document.cookie)" }} category={cat} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    // The dangerous value is shown as text but is NOT rendered as an anchor.
    expect(screen.getByText("javascript:alert(document.cookie)")).toBeInTheDocument();
    const dangerousLink = screen.queryAllByRole("link").find((l) => l.getAttribute("href")?.startsWith("javascript:"));
    expect(dangerousLink).toBeUndefined();
  });

  it("requires a second click to confirm delete", async () => {
    const onDelete = vi.fn();
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={() => {}} onEdit={() => {}} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("fires onEdit", async () => {
    const onEdit = vi.fn();
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={() => {}} onEdit={onEdit} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /edit place/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("renders a full-screen overlay on mobile (no drag handle) with a working close", async () => {
    const onClose = vi.fn();
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={onClose} onEdit={() => {}} onDelete={() => {}} mobile />);
    expect(screen.getByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={onClose} onEdit={() => {}} onDelete={() => {}} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape in the mobile full-screen branch", async () => {
    const onClose = vi.fn();
    renderWithProviders(<DetailPanel poi={poi} category={cat} onClose={onClose} onEdit={() => {}} onDelete={() => {}} mobile />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
