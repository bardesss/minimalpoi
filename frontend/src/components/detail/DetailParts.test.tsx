import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { Poi } from "../../types/api";
import { renderWithProviders } from "../../test/utils";
import { DetailBody } from "./DetailParts";

const poi: Poi = { id: 1, name: "A", address: null, city: null, country_code: null, lat: 1, lng: 2, category_id: null, tags: [], notes: "line1\nline2", phone: null, email: "a@b.nl", website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: null, rating_count: 0 };

describe("DetailBody", () => {
  it("preserves line breaks in notes", () => {
    renderWithProviders(<DetailBody poi={poi} />);
    expect(screen.getByText(/line1/).style.whiteSpace).toBe("pre-wrap");
  });

  it("links a plain email but shows an email with query characters as text", () => {
    const { unmount } = renderWithProviders(<DetailBody poi={poi} />);
    expect(screen.getByRole("link", { name: "a@b.nl" })).toHaveAttribute("href", "mailto:a@b.nl");
    unmount();
    renderWithProviders(<DetailBody poi={{ ...poi, email: "a@b.nl?cc=x@y.z" }} />);
    expect(screen.queryByRole("link", { name: /a@b\.nl/ })).not.toBeInTheDocument();
    expect(screen.getByText("a@b.nl?cc=x@y.z")).toBeInTheDocument();
  });
});
