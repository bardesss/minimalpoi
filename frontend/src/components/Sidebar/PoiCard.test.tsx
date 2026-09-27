// frontend/src/components/Sidebar/PoiCard.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, Poi } from "../../types/api";
import PoiCard from "./PoiCard";
import { cityFromAddress } from "../../lib/country";

const poi: Poi = { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: null, country_code: null, lat: 52.37, lng: 4.9, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: null, rating_count: 0 };
const cat: Category = { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1 };

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

  it("shows a visited badge when visited by me", () => {
    render(<PoiCard poi={poi} category={cat} selected={false} onSelect={() => {}} visited />);
    expect(screen.getByLabelText(/visited/i)).toBeInTheDocument();
  });

  it("omits the visited badge when not visited", () => {
    render(<PoiCard poi={poi} category={cat} selected={false} onSelect={() => {}} />);
    expect(screen.queryByLabelText(/visited/i)).not.toBeInTheDocument();
  });

  it("marks the selected card with aria-current", () => {
    render(<PoiCard poi={poi} category={undefined} selected onSelect={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
  });

  it("reports hover and focus in and out", async () => {
    const onHover = vi.fn();
    render(<PoiCard poi={poi} category={undefined} selected={false} onSelect={() => {}} onHover={onHover} />);
    const card = screen.getByRole("button");
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    fireEvent.focus(card);
    fireEvent.blur(card);
    expect(onHover.mock.calls).toEqual([[poi.id], [null], [poi.id], [null]]);
  });

  it("uses a slim 44px icon band when there is no photo, 78px with one", () => {
    const { rerender } = render(<PoiCard poi={{ ...poi, image_url: null }} category={undefined} selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("card-band").style.height).toBe("44px");
    rerender(<PoiCard poi={{ ...poi, image_url: "https://img.example/a.jpg" }} category={undefined} selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("card-band").style.height).toBe("78px");
  });

  it("keeps the photo-less category icon clear of the visited badge", () => {
    render(<PoiCard poi={{ ...poi, image_url: null, avg_rating: 3.5, rating_count: 2 }} category={cat} selected={false} onSelect={() => {}} visited />);
    const icon = screen.getByTestId("card-icon");
    expect(icon.style.left).toBe("34px");
    expect(icon.style.right).toBe("");
    expect(screen.getByLabelText(/average rating 3.5/i).style.right).toBe("8px");
  });
});
