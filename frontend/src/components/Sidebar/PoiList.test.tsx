// frontend/src/components/Sidebar/PoiList.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Poi } from "../../types/api";
import PoiList from "./PoiList";

// jsdom reports 0 sizes for the scroll container, so the real virtualizer
// would render an empty/minimal window. Mock `useVirtualizer` with a fake
// implementation that renders every row (deterministic regardless of jsdom
// layout) and exposes a spy-able `scrollToIndex`, so we can assert both the
// rendered cards and the reveal-on-select wiring without fighting jsdom.
const { scrollToIndex, useVirtualizerMock } = vi.hoisted(() => {
  const scrollToIndex = vi.fn();
  const useVirtualizerMock = vi.fn((options: { count: number; estimateSize?: () => number }) => {
    const rowSize = options.estimateSize?.() ?? 150;
    const rows = Array.from({ length: options.count }, (_, i) => ({
      key: i,
      index: i,
      start: i * rowSize,
      end: (i + 1) * rowSize,
      size: rowSize,
      lane: 0,
    }));
    return {
      getTotalSize: () => options.count * rowSize,
      getVirtualItems: () => rows,
      scrollToIndex,
      measureElement: () => {},
    };
  });
  return { scrollToIndex, useVirtualizerMock };
});

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: useVirtualizerMock,
}));

const base: Poi = { id: 1, name: "A", address: "x, Town", city: null, country_code: null, lat: 1, lng: 2, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", avg_rating: null, rating_count: 0 };

describe("PoiList", () => {
  beforeEach(() => {
    scrollToIndex.mockClear();
    useVirtualizerMock.mockClear();
  });

  it("reveals the selected card's row via scrollToIndex when the selection changes", () => {
    // cols default to 2 (desktop, non-wide) => rowCount = ceil(4/2) = 2.
    // id 3 is at pois-index 2 => row floor(2/2) = 1.
    const pois = [base, { ...base, id: 2 }, { ...base, id: 3 }, { ...base, id: 4 }];
    const { rerender } = render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollToIndex).not.toHaveBeenCalled();

    rerender(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={3} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollToIndex).toHaveBeenCalledWith(1, expect.objectContaining({ align: "auto" }));
  });

  it("does NOT re-reveal when the pois array identity changes but selection stays the same", () => {
    const pois = [base, { ...base, id: 2 }, { ...base, id: 3 }, { ...base, id: 4 }];
    const { rerender } = render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={3} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollToIndex).toHaveBeenCalledTimes(1);

    // Same items, new array identity (e.g. a re-sort/filter pass) — selection unchanged.
    rerender(
      <PoiList pois={[...pois]} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={3} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />,
    );
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
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
    // Wiring check: the virtualizer is configured with one row per 2 cols.
    expect(useVirtualizerMock).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
  });

  it("marks cards the user has visited", () => {
    render(<PoiList pois={[base, { ...base, id: 2, name: "B" }]} categoriesById={{}} myVisitedPoiIds={new Set([2])} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} />);
    expect(screen.getAllByLabelText(/visited/i)).toHaveLength(1);
  });

  it("renders compact rows in a single column for the list density", () => {
    const pois = [base, { ...base, id: 2, name: "B" }, { ...base, id: 3, name: "C" }];
    render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={3} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} density="list" />,
    );
    // one place per row → 3 rows; selected id 3 is row index 2
    expect(useVirtualizerMock).toHaveBeenLastCalledWith(expect.objectContaining({ count: 3 }));
    expect(scrollToIndex).toHaveBeenCalledWith(2, expect.objectContaining({ align: "auto" }));
    expect(screen.getByRole("button", { name: /^B/ }).style.minHeight).toBe("48px");
  });

  it("uses estimateSize of 52 for list density", () => {
    const pois = [base, { ...base, id: 2, name: "B" }];
    render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} density="list" />,
    );
    const callOptions = useVirtualizerMock.mock.calls[useVirtualizerMock.mock.calls.length - 1][0];
    expect(callOptions.estimateSize!()).toBe(52);
  });

  it("uses estimateSize of 150 for cards density", () => {
    const pois = [base, { ...base, id: 2, name: "B" }];
    render(
      <PoiList pois={pois} categoriesById={{}} myVisitedPoiIds={new Set()} selectedId={null} onSelect={() => {}} isLoading={false} isError={false} onRetry={() => {}} density="cards" />,
    );
    const callOptions = useVirtualizerMock.mock.calls[useVirtualizerMock.mock.calls.length - 1][0];
    expect(callOptions.estimateSize!()).toBe(150);
  });
});
