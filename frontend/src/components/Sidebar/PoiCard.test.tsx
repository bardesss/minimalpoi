// frontend/src/components/Sidebar/PoiCard.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Poi } from "../../types/api";
import PoiCard, { cityFromAddress } from "./PoiCard";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: null, country_code: null, lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0 };
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

  it("shows the average rating badge when rated", () => {
    render(<PoiCard poi={{ ...poi, avg_rating: 3.5, rating_count: 2 }} category={cat} selected={false} onSelect={() => {}} />);
    expect(screen.getByText("3.5")).toBeInTheDocument();
    expect(screen.getByLabelText(/average rating 3.5 from 2 ratings/i)).toBeInTheDocument();
  });

  it("omits the rating badge when there are no ratings", () => {
    render(<PoiCard poi={poi} category={cat} selected={false} onSelect={() => {}} />);
    expect(screen.queryByLabelText(/average rating/i)).not.toBeInTheDocument();
  });
});
