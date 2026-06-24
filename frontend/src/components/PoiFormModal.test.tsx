// frontend/src/components/PoiFormModal.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category } from "../types/api";
import PoiFormModal, { splitTags } from "./PoiFormModal";

const cats: Category[] = [{ id: 1, name: "Restaurants", color: "#E1574C", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" }];

describe("splitTags", () => {
  it("splits on , ; | and trims, dropping empties", () => {
    expect(splitTags("a, b ;c|| d,")).toEqual(["a", "b", "c", "d"]);
  });
});

describe("PoiFormModal", () => {
  it("prefills coords and submits a typed payload", async () => {
    const onSubmit = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.37");
    await userEvent.type(screen.getByLabelText(/^name$/i), "New Spot");
    await userEvent.type(screen.getByLabelText(/^tags$/i), "a, b");
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "New Spot", lat: 52.37, lng: 4.9, tags: ["a", "b"] }));
  });

  it("checks for duplicates on name blur and warns", async () => {
    const onCheckDuplicate = vi.fn();
    const { rerender } = render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={onCheckDuplicate} duplicateId={null} />);
    await userEvent.type(screen.getByLabelText(/^name$/i), "Dup");
    await userEvent.tab();
    expect(onCheckDuplicate).toHaveBeenCalledWith(expect.objectContaining({ name: "Dup", lat: 52.37, lng: 4.9 }));
    rerender(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={onCheckDuplicate} duplicateId={42} />);
    expect(screen.getByText(/looks like a possible duplicate/i)).toBeInTheDocument();
  });

  it("shows edit-mode title and save label", () => {
    render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByRole("heading", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
