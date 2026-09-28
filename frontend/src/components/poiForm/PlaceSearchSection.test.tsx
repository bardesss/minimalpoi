import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlaceSearchSection } from "./PlaceSearchSection";
import { ApiError } from "../../api/client";

describe("PlaceSearchSection", () => {
  it("uses a provider-neutral placeholder and enterKeyHint", () => {
    render(
      <PlaceSearchSection
        onSearchPlaces={vi.fn()}
        onApplyDraft={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search places by name");
    expect(input).toHaveAttribute("enterkeyhint", "search");
  });

  it("shows the OpenStreetMap caption when a result comes from OSM", async () => {
    const onSearchPlaces = vi.fn().mockResolvedValue([
      { place_id: "osm:N1", name: "Cafe", address: "Somewhere", lat: 1, lng: 2, source: "osm" },
    ]);
    render(<PlaceSearchSection onSearchPlaces={onSearchPlaces} onApplyDraft={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Search places by name"), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByText("Results from OpenStreetMap")).toBeInTheDocument();
  });

  it("applies the draft crediting OpenStreetMap when the picked result is OSM", async () => {
    const onSearchPlaces = vi.fn().mockResolvedValue([
      { place_id: "osm:N1", name: "Cafe", address: "Somewhere", lat: 1, lng: 2, source: "osm" },
    ]);
    const onPickPlace = vi.fn().mockResolvedValue({ name: "Cafe", lat: 1, lng: 2 });
    const onApplyDraft = vi.fn();
    render(<PlaceSearchSection onSearchPlaces={onSearchPlaces} onPickPlace={onPickPlace} onApplyDraft={onApplyDraft} />);
    fireEvent.change(screen.getByPlaceholderText("Search places by name"), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /cafe/i }));
    await waitFor(() => expect(onApplyDraft).toHaveBeenCalledWith({ name: "Cafe", lat: 1, lng: 2 }, "OpenStreetMap"));
  });

  it("applies the draft crediting Google Places when the picked result is Google", async () => {
    const onSearchPlaces = vi.fn().mockResolvedValue([
      { place_id: "g1", name: "Cafe", address: "Somewhere", lat: 1, lng: 2, source: "google" },
    ]);
    const onPickPlace = vi.fn().mockResolvedValue({ name: "Cafe", lat: 1, lng: 2 });
    const onApplyDraft = vi.fn();
    render(<PlaceSearchSection onSearchPlaces={onSearchPlaces} onPickPlace={onPickPlace} onApplyDraft={onApplyDraft} />);
    fireEvent.change(screen.getByPlaceholderText("Search places by name"), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /cafe/i }));
    await waitFor(() => expect(onApplyDraft).toHaveBeenCalledWith({ name: "Cafe", lat: 1, lng: 2 }, "Google Places"));
  });

  it("shows a provider-neutral error with no mention of a Google API key", async () => {
    const onSearchPlaces = vi.fn().mockRejectedValue(new Error("boom"));
    render(<PlaceSearchSection onSearchPlaces={onSearchPlaces} onApplyDraft={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Search places by name"), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Search failed — try again, or fill the form manually.");
    expect(status.textContent).not.toMatch(/google api key/i);
  });

  it("shows the backend's detail message when search fails with a 400 ApiError", async () => {
    const onSearchPlaces = vi.fn().mockRejectedValue(new ApiError(400, "Stored Google API key can't be decrypted"));
    render(<PlaceSearchSection onSearchPlaces={onSearchPlaces} onApplyDraft={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Search places by name"), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByText(/stored google api key can't be decrypted/i)).toBeInTheDocument();
  });
});
