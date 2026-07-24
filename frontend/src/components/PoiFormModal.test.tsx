// frontend/src/components/PoiFormModal.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, PoiDraft } from "../types/api";
import { ApiError } from "../api/client";
import PoiFormModal, { splitTags, parseCoord, parseCoordPair } from "./PoiFormModal";

describe("parseCoord", () => {
  it("parses a plain number", () => {
    expect(parseCoord("52.3676")).toBe(52.3676);
    expect(parseCoord(" -4.5 ")).toBe(-4.5);
  });
  it("accepts a lone decimal comma", () => {
    expect(parseCoord("52,3676")).toBe(52.3676);
  });
  it("rejects junk and empties", () => {
    expect(parseCoord("")).toBeNull();
    expect(parseCoord("abc")).toBeNull();
    expect(parseCoord("52.3, 4.9")).toBeNull();
  });
});

describe("parseCoordPair", () => {
  it("splits a pasted dot-decimal pair", () => {
    expect(parseCoordPair("52.3676, 4.9041")).toEqual({ lat: 52.3676, lng: 4.9041 });
  });
  it("splits a whitespace-separated pair", () => {
    expect(parseCoordPair("52.3676 4.9041")).toEqual({ lat: 52.3676, lng: 4.9041 });
  });
  it("does not treat a lone decimal comma as a pair", () => {
    expect(parseCoordPair("52,3676")).toBeNull();
  });
  it("returns null for a single value", () => {
    expect(parseCoordPair("52.3676")).toBeNull();
  });
});

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

  it("splits a pasted 'lat, lng' pair across both coordinate fields", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: "52.3676, 4.9041" } });
    expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.3676");
    expect(screen.getByLabelText(/longitude/i)).toHaveValue("4.9041");
  });

  it("blocks save and warns when coordinates are invalid", async () => {
    const onSubmit = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    await userEvent.type(screen.getByLabelText(/^name$/i), "No Coords");
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(await screen.findByText(/enter valid coordinates/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a backend error instead of failing silently", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(422, "Coordinates required"));
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    await userEvent.type(screen.getByLabelText(/^name$/i), "Boom");
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(await screen.findByText(/coordinates required/i)).toBeInTheDocument();
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
    render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByRole("heading", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  // Escape closes the edit-mode modal (add mode is click-through; edit mode is a true modal).
  it("closes the edit modal on Escape", async () => {
    const onClose = vi.fn();
    render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={onClose} onCheckDuplicate={() => {}} duplicateId={null} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("names the dialog for assistive tech", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByRole("dialog", { name: /add a new place/i })).toBeInTheDocument();
  });
});

const draft: PoiDraft = {
  name: "Enriched Spot", address: "1 Main St", city: null, country_code: null, lat: 52.1, lng: 4.2,
  image_url: "https://img.example/p.jpg", description: "Lovely.",
  phone: "+31 1", website: "https://e.example", source_url: "https://e.example",
  field_sources: { name: "jsonld", lat: "og" },
};

describe("PoiFormModal enrich", () => {
  it("enriches, prefills fields, shows provenance + image, and submits image_url", async () => {
    const onEnrich = vi.fn().mockResolvedValue(draft);
    const onSubmit = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onEnrich={onEnrich} />);
    await userEvent.type(screen.getByLabelText(/enrich from url/i), "https://e.example");
    await userEvent.click(screen.getByRole("button", { name: /^enrich$/i }));
    await screen.findByDisplayValue("Enriched Spot");
    expect(screen.getByLabelText(/^website$/i)).toHaveValue("https://e.example");
    expect(screen.getByText(/filled .* fields from/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Enriched Spot", image_url: "https://img.example/p.jpg" }));
  });

  // Regression: the enrich input sits inside the <form> added for Enter-to-submit.
  // Pressing Enter there must run enrichment, not submit the whole form.
  it("pressing Enter in the enrich field runs enrich, not form submit", async () => {
    const onEnrich = vi.fn().mockResolvedValue(draft);
    const onSubmit = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onEnrich={onEnrich} />);
    await userEvent.type(screen.getByLabelText(/enrich from url/i), "https://e.example{Enter}");
    await screen.findByDisplayValue("Enriched Spot");
    expect(onEnrich).toHaveBeenCalledWith("https://e.example");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an inline message when enrich fails and keeps the form usable", async () => {
    const onEnrich = vi.fn().mockRejectedValue(new Error("boom"));
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onEnrich={onEnrich} />);
    await userEvent.type(screen.getByLabelText(/enrich from url/i), "https://bad.example");
    await userEvent.click(screen.getByRole("button", { name: /^enrich$/i }));
    await screen.findByText(/couldn't read that link/i);
    expect(screen.getByLabelText(/^name$/i)).toBeEnabled();
  });

  it("searches places, picks one, fills the form, and submits city/country", async () => {
    const onSearchPlaces = vi.fn().mockResolvedValue([
      { place_id: "PID1", name: "Taco Lindo West", address: "B St 2, Haarlem, Netherlands", lat: null, lng: null },
    ]);
    const onPickPlace = vi.fn().mockResolvedValue({
      name: "Taco Lindo West", address: "B St 2, Haarlem, Netherlands", city: "Haarlem", country_code: "NL",
      lat: 52.38, lng: 4.85, image_url: null, description: null, phone: null, website: "https://taco.example",
      source_url: null, field_sources: { name: "places", country_code: "places" },
    });
    const onSubmit = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onSearchPlaces={onSearchPlaces} onPickPlace={onPickPlace} />);
    await userEvent.type(screen.getByLabelText(/search places/i), "taco lindo");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));
    const result = await screen.findByText("Taco Lindo West");
    await userEvent.click(result);
    await screen.findByDisplayValue("Taco Lindo West");
    expect(screen.getByLabelText(/^website$/i)).toHaveValue("https://taco.example");
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Taco Lindo West", city: "Haarlem", country_code: "NL" }));
  });

  it("shows a hint when search fails (e.g. no Google key)", async () => {
    const onSearchPlaces = vi.fn().mockRejectedValue(new Error("400"));
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onSearchPlaces={onSearchPlaces} onPickPlace={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/search places/i), "taco");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await screen.findByText(/google api key in settings/i);
  });

  it("edit mode pre-fills the existing image and preserves it on save", async () => {
    const onSubmit = vi.fn();
    render(
      <PoiFormModal
        mode="edit"
        initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: "/images/keep.webp" }}
        categories={cats}
        coords={null}
        onSubmit={onSubmit}
        onClose={() => {}}
        onCheckDuplicate={() => {}}
        duplicateId={null}
      />,
    );
    expect(screen.getByLabelText(/image preview/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: "/images/keep.webp" }));
  });

  it("uploads a chosen file, previews it, and submits its url", async () => {
    const onUploadImage = vi.fn().mockResolvedValue({ url: "/images/up.webp" });
    const onSubmit = vi.fn();
    render(
      <PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={onSubmit} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onUploadImage={onUploadImage} />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Pic Spot");
    await userEvent.upload(screen.getByLabelText(/choose image/i), new File(["x"], "p.png", { type: "image/png" }));
    expect(onUploadImage).toHaveBeenCalled();
    await screen.findByLabelText(/image preview/i);
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: "/images/up.webp" }));
  });

  it("removes the image so save sends null", async () => {
    const onSubmit = vi.fn();
    render(
      <PoiFormModal
        mode="edit"
        initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: "/images/keep.webp" }}
        categories={cats}
        coords={null}
        onSubmit={onSubmit}
        onClose={() => {}}
        onCheckDuplicate={() => {}}
        duplicateId={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /remove image/i }));
    expect(screen.queryByLabelText(/image preview/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: null }));
  });

  it("shows an inline message when the upload is rejected (e.g. 413)", async () => {
    const onUploadImage = vi.fn().mockRejectedValue(new ApiError(413, "Image too large (max 10 MB)"));
    render(
      <PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onUploadImage={onUploadImage} />,
    );
    await userEvent.upload(screen.getByLabelText(/choose image/i), new File(["x"], "big.png", { type: "image/png" }));
    await screen.findByText(/image too large/i);
  });

  it("does not render the enrich row in edit mode", () => {
    render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.queryByLabelText(/enrich from url/i)).not.toBeInTheDocument();
  });
});
