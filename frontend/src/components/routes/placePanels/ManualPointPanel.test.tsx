import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ManualPointPanel from "./ManualPointPanel";

describe("ManualPointPanel", () => {
  it("submits a name + numeric coordinates", () => {
    const onPick = vi.fn();
    render(<ManualPointPanel onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Point name"), { target: { value: "Camp" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "52.1" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "5.2" } });
    fireEvent.click(screen.getByRole("button", { name: /add point/i }));
    expect(onPick).toHaveBeenCalledWith({ name: "Camp", lat: 52.1, lng: 5.2 });
  });

  it("does nothing when the name is blank or coords are not numbers", () => {
    const onPick = vi.fn();
    render(<ManualPointPanel onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /add point/i }));
    expect(onPick).not.toHaveBeenCalled();
  });
});
