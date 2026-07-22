import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedPlacePanel from "./SavedPlacePanel";

vi.mock("../../../queries/hooks", () => ({
  usePois: () => ({ data: [{ id: 7, name: "Utrecht", lat: 52.09, lng: 5.12 }] }),
}));

describe("SavedPlacePanel", () => {
  it("picks a saved place by poi_id", () => {
    const onPick = vi.fn();
    render(<SavedPlacePanel onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(onPick).toHaveBeenCalledWith({ poi_id: 7 });
  });

  it("filters the list by the search box", () => {
    render(<SavedPlacePanel onPick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search places"), { target: { value: "zzz" } });
    expect(screen.getByText("No matching places.")).toBeInTheDocument();
  });
});
