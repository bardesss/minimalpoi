import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchPlacePanel from "./SearchPlacePanel";

const searchMut = { mutateAsync: vi.fn() };
const draftMut = { mutateAsync: vi.fn() };
const createMut = { mutateAsync: vi.fn() };
vi.mock("../../../queries/hooks", () => ({
  useSearchPlaces: () => searchMut,
  usePlaceDraft: () => draftMut,
  useCreatePoi: () => createMut,
}));

describe("SearchPlacePanel", () => {
  it("searches, selects, and adds an ad-hoc point (no save)", async () => {
    searchMut.mutateAsync.mockResolvedValue([{ place_id: "p1", name: "Eiffel", address: "Paris" }]);
    draftMut.mutateAsync.mockResolvedValue({ name: "Eiffel Tower", lat: 48.85, lng: 2.29 });
    const onPick = vi.fn();
    render(<SearchPlacePanel onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Search Google"), { target: { value: "eiffel" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /eiffel/i }));
    fireEvent.click(await screen.findByRole("button", { name: /add place/i }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ name: "Eiffel Tower", lat: 48.85, lng: 2.29 }));
  });

  it("also saves the place to my places and reports poi_id", async () => {
    searchMut.mutateAsync.mockResolvedValue([{ place_id: "p1", name: "Eiffel", address: "Paris" }]);
    draftMut.mutateAsync.mockResolvedValue({ name: "Eiffel Tower", lat: 48.85, lng: 2.29 });
    createMut.mutateAsync.mockResolvedValue({ id: 99 });
    const onPick = vi.fn();
    render(<SearchPlacePanel onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Search Google"), { target: { value: "eiffel" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /eiffel/i }));
    fireEvent.click(await screen.findByLabelText(/also save to my places/i));
    fireEvent.click(await screen.findByRole("button", { name: /add place/i }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ poi_id: 99 }));
  });

  it("shows an error when search fails", async () => {
    searchMut.mutateAsync.mockRejectedValue(new Error("boom"));
    const onPick = vi.fn();
    render(<SearchPlacePanel onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Search Google"), { target: { value: "eiffel" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/search failed/i);
  });
});
