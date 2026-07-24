// frontend/src/components/Sidebar/PoiList.test.tsx
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Poi } from "../../types/api";
import PoiList from "./PoiList";

const base: Poi = { id: 1, name: "A", address: "x, Town", city: null, country_code: null, lat: 1, lng: 2, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0 };

describe("PoiList", () => {
  const scrollIntoView = vi.fn();
  beforeAll(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  beforeEach(() => {
    scrollIntoView.mockClear();
  });

  it("scrolls the selected card into view (nearest) when the selection changes", () => {
    const pois = [base, { ...base, id: 2, name: "B" }];
    const { rerender } = render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={2} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    expect(scrollIntoView.mock.instances[0]).toHaveProperty("dataset.poiId", "2");
  });

  it("renders an error state with retry", async () => {
    const onRetry = vi.fn();
    render(<PoiList pois={[]} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders an empty prompt", () => {
    render(<PoiList pois={[]} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />);
    expect(screen.getByText(/add your first place/i)).toBeInTheDocument();
  });

  it("renders cards", () => {
    render(<PoiList pois={[base, { ...base, id: 2, name: "B" }]} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={2} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("marks cards the user has visited", () => {
    render(<PoiList pois={[base, { ...base, id: 2, name: "B" }]} categoriesById={{}} myVisitedPoiIds={new Set([2])} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />);
    expect(screen.getAllByLabelText(/visited/i)).toHaveLength(1);
  });
});
