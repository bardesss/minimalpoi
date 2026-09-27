import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Category, Poi } from "../../types/api";
import PoiRow from "./PoiRow";

const poi: Poi = { id: 7, name: "Café Modern", address: "Street 12, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: 4.5, rating_count: 2 };
const cat: Category = { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1 };

describe("PoiRow", () => {
  it("shows name, city and rating in a 48px row and selects on click", () => {
    const onSelect = vi.fn();
    render(<PoiRow poi={poi} category={cat} selected={false} onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: /café modern/i });
    expect(row.style.minHeight).toBe("48px");
    expect(screen.getByText("Amsterdam")).toBeInTheDocument();
    expect(screen.getByLabelText(/average rating 4\.5/i)).toBeInTheDocument();
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("marks selection and visited, and reports hover", () => {
    const onHover = vi.fn();
    render(<PoiRow poi={poi} category={cat} selected visited onSelect={() => {}} onHover={onHover} />);
    const row = screen.getByRole("button", { name: /café modern/i });
    expect(row).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Visited by you")).toBeInTheDocument();
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);
    expect(onHover.mock.calls).toEqual([[7], [null]]);
  });

  it("shows a 38px thumbnail only when there is a photo", () => {
    const { rerender } = render(<PoiRow poi={poi} category={cat} selected={false} onSelect={() => {}} />);
    expect(screen.queryByTestId("row-thumb")).not.toBeInTheDocument();
    rerender(<PoiRow poi={{ ...poi, image_url: "https://img.example/a.jpg" }} category={cat} selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("row-thumb").style.width).toBe("38px");
    expect(screen.getByTestId("row-thumb").style.height).toBe("38px");
  });
});
