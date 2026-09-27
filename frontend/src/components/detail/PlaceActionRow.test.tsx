import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Poi } from "../../types/api";
import { renderWithProviders } from "../../test/utils";
import PlaceActionRow from "./PlaceActionRow";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.37012, lng: 4.90011, category_id: 1, tags: [], notes: null, phone: "+31 20 300 1234", email: "info@place.nl", website: "https://place.nl", image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: null, rating_count: 0 };

afterEach(() => {
  vi.restoreAllMocks();
  // navigator.share is assigned per test; remove it again.
  delete (navigator as { share?: unknown }).share;
  // navigator.clipboard is defined per test; remove it again.
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe("PlaceActionRow", () => {
  it("links Directions, Call, Email and Website", () => {
    renderWithProviders(<PlaceActionRow poi={poi} />);
    expect(screen.getByRole("link", { name: /directions/i }).getAttribute("href")).toMatch(/52\.37012,4\.90011$/);
    expect(screen.getByRole("link", { name: /call/i })).toHaveAttribute("href", "tel:+31203001234");
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute("href", "mailto:info@place.nl");
    expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute("href", "https://place.nl");
  });

  it("omits actions whose data is missing and never links an unsafe website", () => {
    renderWithProviders(<PlaceActionRow poi={{ ...poi, phone: null, email: null, website: "javascript:alert(1)" }} />);
    expect(screen.queryByRole("link", { name: /call/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /website/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /directions/i })).toBeInTheDocument();
  });

  it("shares via the Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderWithProviders(<PlaceActionRow poi={poi} />);
    await userEvent.click(screen.getByRole("button", { name: /share/i }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Café Modern", text: "Street 12, Amsterdam" }));
  });

  it("falls back to copying and a toast without the Web Share API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWithProviders(<PlaceActionRow poi={poi} />);
    await userEvent.click(screen.getByRole("button", { name: /share/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Café Modern — Street 12, Amsterdam — https://"));
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });
});
