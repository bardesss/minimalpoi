import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddPlaceModal from "./AddPlaceModal";

vi.mock("../../queries/hooks", () => ({
  usePois: () => ({ data: [{ id: 7, name: "Utrecht", lat: 52.09, lng: 5.12 }] }),
  useSearchPlaces: () => ({ mutateAsync: vi.fn() }),
  usePlaceDraft: () => ({ mutateAsync: vi.fn() }),
  useCreatePoi: () => ({ mutateAsync: vi.fn() }),
}));

describe("AddPlaceModal", () => {
  it("shows the three methods and the action title", () => {
    render(<AddPlaceModal kind="stop" onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/add stop/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saved place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search a place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter coordinates/i })).toBeInTheDocument();
  });

  it("routes a saved-place pick into a stop body", () => {
    const onSubmit = vi.fn();
    render(<AddPlaceModal kind="stop" onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /saved place/i }));
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "stop", poi_id: 7, nights: null });
  });

  it("includes a nights field for a stay and puts it in the body", () => {
    const onSubmit = vi.fn();
    render(<AddPlaceModal kind="stay" onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /saved place/i }));
    fireEvent.change(screen.getByLabelText(/nights/i), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "stay", poi_id: 7, nights: 3 });
  });

  it("adds the role for an endpoint and omits nights", () => {
    const onSubmit = vi.fn();
    render(<AddPlaceModal kind="stop" role="start" onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.getByText(/set start place/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enter coordinates/i }));
    fireEvent.change(screen.getByLabelText("Point name"), { target: { value: "Home" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /add point/i }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "stop", role: "start", name: "Home", lat: 1, lng: 2, nights: null });
  });

  it("Back returns to the chooser", () => {
    render(<AddPlaceModal kind="stop" onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /enter coordinates/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /saved place/i })).toBeInTheDocument();
  });
});
