// frontend/src/components/Sidebar/PoiCard.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Poi } from "../../types/api";
import PoiCard, { cityFromAddress } from "./PoiCard";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced" };
const cat: Category = { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1, trip_category_id: null, trip_sync_status: "synced" };

describe("PoiCard", () => {
  it("derives the city from the address tail", () => {
    expect(cityFromAddress("Street 12, Amsterdam")).toBe("Amsterdam");
    expect(cityFromAddress(null)).toBe("");
  });

  it("renders name + category and fires onSelect", async () => {
    const onSelect = vi.fn();
    render(<PoiCard poi={poi} category={cat} selected={false} onSelect={onSelect} />);
    expect(screen.getByText("Café Modern")).toBeInTheDocument();
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Café Modern"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("labels an uncategorized poi", () => {
    render(<PoiCard poi={{ ...poi, category_id: null }} category={undefined} selected={false} onSelect={() => {}} />);
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });
});
