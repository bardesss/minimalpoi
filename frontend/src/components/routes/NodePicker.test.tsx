import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NodePicker, { toPoiCreate } from "./NodePicker";
import type { PoiDraft } from "../../types/api";

const draft: PoiDraft = {
  name: "Taco Lindo", address: "Main St 1", city: "Austin", country_code: "US",
  lat: 30.27, lng: -97.74, image_url: null, description: "great tacos",
  phone: "+1512", website: "https://taco.example", source_url: null, field_sources: {},
};

const onSubmit = vi.fn();
const onCancel = vi.fn();
const searchAsync = vi.fn();
const draftAsync = vi.fn();
const createAsync = vi.fn();

vi.mock("../../queries/hooks", () => ({
  usePois: () => ({ data: [{ id: 7, name: "Utrecht", lat: 52.09, lng: 5.12 }] }),
  useSearchPlaces: () => ({ mutateAsync: searchAsync }),
  usePlaceDraft: () => ({ mutateAsync: draftAsync }),
  useCreatePoi: () => ({ mutateAsync: createAsync }),
}));

beforeEach(() => {
  onSubmit.mockClear();
  onCancel.mockClear();
  searchAsync.mockReset();
  draftAsync.mockReset();
  createAsync.mockReset();
});

async function openGoogleAndPick() {
  searchAsync.mockResolvedValue([{ place_id: "p1", name: "Taco Lindo", address: "Main St 1", lat: null, lng: null }]);
  draftAsync.mockResolvedValue(draft);
  fireEvent.click(screen.getByRole("button", { name: "Search Google" }));
  fireEvent.change(screen.getByLabelText(/search google/i), { target: { value: "taco" } });
  fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
  fireEvent.click(await screen.findByRole("button", { name: /taco lindo/i }));
}

describe("toPoiCreate", () => {
  it("maps a resolved draft into a create payload", () => {
    expect(toPoiCreate(draft)).toEqual({
      name: "Taco Lindo",
      lat: 30.27,
      lng: -97.74,
      address: "Main St 1",
      city: "Austin",
      country_code: "US",
      category_id: null,
      tags: [],
      notes: "great tacos",
      phone: "+1512",
      website: "https://taco.example",
      image_url: null,
      source_url: null,
    });
  });
});

describe("NodePicker saved-POI mode", () => {
  it("picks a saved POI and submits poi_id", () => {
    render(<NodePicker kind="stop" onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "stop", poi_id: 7, nights: null });
  });
});

describe("NodePicker Google mode", () => {
  it("adds a Google result as an ad-hoc node when 'also save' is off", async () => {
    render(<NodePicker kind="stay" onCancel={onCancel} onSubmit={onSubmit} />);
    await openGoogleAndPick();
    fireEvent.click(await screen.findByRole("button", { name: /add stay/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ kind: "stay", name: "Taco Lindo", lat: 30.27, lng: -97.74, nights: 1 }),
    );
    expect(createAsync).not.toHaveBeenCalled();
  });

  it("saves the result as a POI and submits poi_id when 'also save' is on", async () => {
    createAsync.mockResolvedValue({ id: 42, name: "Taco Lindo" });
    render(<NodePicker kind="stop" onCancel={onCancel} onSubmit={onSubmit} />);
    await openGoogleAndPick();
    fireEvent.click(await screen.findByRole("checkbox", { name: /also save/i }));
    fireEvent.click(screen.getByRole("button", { name: /add stop/i }));
    await waitFor(() => expect(createAsync).toHaveBeenCalledWith(expect.objectContaining({ name: "Taco Lindo" })));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "stop", poi_id: 42, nights: null });
  });

  it("shows an error when Google search fails", async () => {
    searchAsync.mockRejectedValue(new Error("400"));
    render(<NodePicker kind="stop" onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Search Google" }));
    fireEvent.change(screen.getByLabelText(/search google/i), { target: { value: "taco" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByText(/search failed/i)).toBeInTheDocument();
  });
});
