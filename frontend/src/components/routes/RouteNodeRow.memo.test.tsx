import { describe, expect, it, beforeEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RouteNodeRow from "./RouteNodeRow";
import type { RouteNode } from "../../types/api";

// useSortable runs exactly once per row render, so its call count doubles as a
// render counter for the row. Created via vi.hoisted because vi.mock's factory
// is hoisted above top-level consts (see MapView.test.tsx for the same trap).
const { sortableSpy } = vi.hoisted(() => ({
  sortableSpy: vi.fn(() => ({
    attributes: {}, listeners: {}, setNodeRef: () => {},
    transform: null, transition: undefined, isDragging: false,
  })),
}));
vi.mock("@dnd-kit/sortable", () => ({ useSortable: sortableSpy }));
vi.mock("@dnd-kit/utilities", () => ({ CSS: { Transform: { toString: () => "" } } }));
vi.mock("../../queries/hooks", () => ({
  useUpdateNode: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNode: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../../lib/useMediaQuery", () => ({
  useIsMobile: () => false,
  useIsCoarsePointer: () => false,
}));

const node: RouteNode = {
  id: 5, kind: "stay", position: 1, nights: 2, notes: null, poi_id: null,
  name: "Amsterdam", lat: 52.3, lng: 4.9, arrive_date: "2026-07-14",
  depart_date: "2026-07-16", inbound_distance_m: 0, inbound_duration_s: 0, role: null,
};
const onHover = () => {}; // stable identity across parent re-renders

function Harness() {
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => setN(n + 1)}>bump {n}</button>
      <RouteNodeRow node={node} routeId={1} canEdit onHover={onHover} />
    </>
  );
}

beforeEach(() => sortableSpy.mockClear());

describe("RouteNodeRow memoization", () => {
  it("does not re-render when an unrelated parent state changes and its props are stable", () => {
    render(<Harness />);
    expect(sortableSpy).toHaveBeenCalledTimes(1); // initial render
    fireEvent.click(screen.getByRole("button", { name: /bump/i }));
    expect(sortableSpy).toHaveBeenCalledTimes(1); // memo bailed — no re-render
  });
});
