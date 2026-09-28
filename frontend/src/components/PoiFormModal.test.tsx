// frontend/src/components/PoiFormModal.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category, PoiDraft } from "../types/api";
import { ApiError } from "../api/client";
import PoiFormModal, { parseCoord, parseCoordPair } from "./PoiFormModal";
import { splitTags } from "../lib/tags";
import { MapInsetsProvider, useMapInsetsReader } from "../map/useMapInsets";
import type { Insets } from "../map/mapInsets";

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

const cats: Category[] = [{ id: 1, name: "Restaurants", color: "#E1574C", icon: null, created_by: 1 }];

// Overrides matchMedia -> mobile so mobile-only affordances (the ≥44px close
// button, the "Pick on map" button) render. Returns a restore function.
function mockMobileMatchMedia() {
  const original = window.matchMedia;
  window.matchMedia = ((q: string) => ({
    matches: true,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

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

  it("gives the close button a ≥44px touch target on mobile", () => {
    const restore = mockMobileMatchMedia();
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      const close = screen.getByRole("button", { name: /close/i });
      expect(parseInt(close.style.width, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(close.style.height, 10)).toBeGreaterThanOrEqual(44);
    } finally {
      restore();
    }
  });
});

describe("PoiFormModal pick on map (mobile)", () => {
  it("enters pick mode and writes the map center into the coordinate fields", async () => {
    const restore = mockMobileMatchMedia();
    try {
      const getMapCenter = vi.fn(() => ({ lng: 4.9, lat: 52.37 }));
      render(
        <PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} getMapCenter={getMapCenter} />,
      );
      await userEvent.click(screen.getByRole("button", { name: /pick on map/i }));
      // The dialog keeps an accessible name while picking (its <h2> is hidden,
      // so it must fall back to aria-label rather than a dangling aria-labelledby).
      expect(screen.getByRole("dialog", { name: /pick a location/i })).toBeInTheDocument();
      const use = screen.getByRole("button", { name: /use this location/i });
      await userEvent.click(use);
      expect(getMapCenter).toHaveBeenCalled();
      expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.37");
      expect(screen.getByLabelText(/longitude/i)).toHaveValue("4.9");
    } finally {
      restore();
    }
  });

  it("moves focus to Use this location on entering pick mode, and back to Pick on map on cancel", async () => {
    const restore = mockMobileMatchMedia();
    try {
      render(
        <PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} getMapCenter={() => ({ lng: 4.9, lat: 52.37 })} />,
      );
      const pickOnMap = screen.getByRole("button", { name: /pick on map/i });
      await userEvent.click(pickOnMap);
      const use = screen.getByRole("button", { name: /use this location/i });
      expect(use).toHaveFocus();
      await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(screen.getByRole("button", { name: /pick on map/i })).toHaveFocus();
    } finally {
      restore();
    }
  });

  it("cancel leaves pick mode without changing the coordinates", async () => {
    const restore = mockMobileMatchMedia();
    try {
      const getMapCenter = vi.fn(() => ({ lng: 4.9, lat: 52.37 }));
      render(
        <PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 1, lat: 2 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} getMapCenter={getMapCenter} />,
      );
      await userEvent.click(screen.getByRole("button", { name: /pick on map/i }));
      await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(getMapCenter).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: /use this location/i })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/latitude/i)).toHaveValue("2");
      expect(screen.getByLabelText(/longitude/i)).toHaveValue("1");
    } finally {
      restore();
    }
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

  it("shows a hint when search fails", async () => {
    const onSearchPlaces = vi.fn().mockRejectedValue(new Error("400"));
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onSearchPlaces={onSearchPlaces} onPickPlace={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/search places/i), "taco");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await screen.findByText(/search failed — try again, or fill the form manually/i);
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
    await userEvent.upload(screen.getByLabelText(/add photo/i), new File(["x"], "p.png", { type: "image/png" }));
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
    await userEvent.upload(screen.getByLabelText(/add photo/i), new File(["x"], "big.png", { type: "image/png" }));
    await screen.findByText(/image too large/i);
  });

  it("does not render the enrich row in edit mode", () => {
    render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.queryByLabelText(/enrich from url/i)).not.toBeInTheDocument();
  });
});

describe("PoiFormModal inputs (Task 4)", () => {
  it("gives the website field a url keyboard", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByLabelText(/^website$/i)).toHaveAttribute("type", "url");
    expect(screen.getByLabelText(/^website$/i)).toHaveAttribute("inputmode", "url");
  });

  it("stacks the Category/Tags row on mobile", () => {
    const restore = mockMobileMatchMedia();
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      const categoryLabel = screen.getByText("Category");
      const wrapper = categoryLabel.closest("div")?.parentElement;
      expect(wrapper).toHaveStyle({ flexDirection: "column" });
    } finally {
      restore();
    }
  });

  it("does not stack the Category/Tags row on desktop", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    const categoryLabel = screen.getByText("Category");
    const wrapper = categoryLabel.closest("div")?.parentElement;
    expect(wrapper).toHaveStyle({ flexDirection: "row" });
  });
});

// Stubs navigator.geolocation for the "Use my location" tests below. Returns
// a restore function; jsdom has no real geolocation implementation.
function mockGeolocation(impl: {
  getCurrentPosition: (
    ok: (pos: { coords: { latitude: number; longitude: number } }) => void,
    err?: (e: { code: number }) => void,
  ) => void;
}) {
  const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  Object.defineProperty(navigator, "geolocation", { value: impl, configurable: true });
  return () => {
    if (original) Object.defineProperty(navigator, "geolocation", original);
    else delete (navigator as unknown as { geolocation?: unknown }).geolocation;
  };
}

describe("PoiFormModal coordinate rounding", () => {
  it("rounds coords seeded from the map to 6 decimal places", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.868600001, lat: 52.357999999 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.358");
    expect(screen.getByLabelText(/longitude/i)).toHaveValue("4.8686");
  });
});

describe("PoiFormModal use my location", () => {
  it("sets rounded coordinates and calls onLocated on success", async () => {
    const onLocated = vi.fn();
    const restore = mockGeolocation({
      getCurrentPosition: (ok) => ok({ coords: { latitude: 52.1234567, longitude: 4.7654321 } }),
    });
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onLocated={onLocated} />);
      await userEvent.click(screen.getByRole("button", { name: /use my location/i }));
      expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.123457");
      expect(screen.getByLabelText(/longitude/i)).toHaveValue("4.765432");
      expect(onLocated).toHaveBeenCalledWith({ lat: 52.123457, lng: 4.765432 });
    } finally {
      restore();
    }
  });

  it("shows a permission-denied message on error code 1", async () => {
    const restore = mockGeolocation({
      getCurrentPosition: (_ok, err) => err?.({ code: 1 }),
    });
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      await userEvent.click(screen.getByRole("button", { name: /use my location/i }));
      expect(await screen.findByText(/location permission was denied/i)).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

describe("PoiFormModal use my location is add-only", () => {
  it("shows Use my location in add mode", () => {
    const restoreGeo = mockGeolocation({ getCurrentPosition: () => {} });
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.getByRole("button", { name: /use my location/i })).toBeInTheDocument();
    } finally {
      restoreGeo();
    }
  });

  it("hides Use my location in edit mode on desktop", () => {
    const restoreGeo = mockGeolocation({ getCurrentPosition: () => {} });
    try {
      render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();
    } finally {
      restoreGeo();
    }
  });

  it("hides Use my location in edit mode on mobile, but keeps the summary and Edit coordinates disclosure", () => {
    const restore = mockMobileMatchMedia();
    const restoreGeo = mockGeolocation({ getCurrentPosition: () => {} });
    try {
      render(<PoiFormModal mode="edit" initial={{ name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null }} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();
      expect(screen.getByText("1.00000, 2.00000")).toBeInTheDocument();
      expect(screen.getByText(/edit coordinates/i)).toBeInTheDocument();
    } finally {
      restore();
      restoreGeo();
    }
  });
});

type GeoSuccessCb = (pos: { coords: { latitude: number; longitude: number } }) => void;

describe("PoiFormModal unmount guard", () => {
  it("does not call onLocated after the form unmounts", async () => {
    const onLocated = vi.fn();
    const captured: { ok: GeoSuccessCb | null } = { ok: null };
    const restore = mockGeolocation({
      getCurrentPosition: (ok) => {
        captured.ok = ok;
      },
    });
    try {
      const { unmount } = render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onLocated={onLocated} />);
      await userEvent.click(screen.getByRole("button", { name: /use my location/i }));
      unmount();
      captured.ok?.({ coords: { latitude: 52.1, longitude: 4.7 } });
      expect(onLocated).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});

describe("PoiFormModal coordinate errors and duplicate checks", () => {
  it("opens the Edit coordinates disclosure on mobile when submit reports an invalid coordinate", async () => {
    const restore = mockMobileMatchMedia();
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      await userEvent.type(screen.getByLabelText(/^name$/i), "Bad Coords");
      const details = screen.getByText(/edit coordinates/i).closest("details");
      expect(details).not.toHaveAttribute("open");
      await userEvent.click(screen.getByRole("button", { name: /add place/i }));
      await screen.findByText(/enter valid coordinates/i);
      expect(details).toHaveAttribute("open");
    } finally {
      restore();
    }
  });

  it("runs the duplicate check with the located coordinates after Use my location", async () => {
    const onCheckDuplicate = vi.fn();
    const restore = mockGeolocation({
      getCurrentPosition: (ok) => ok({ coords: { latitude: 52.1234567, longitude: 4.7654321 } }),
    });
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={onCheckDuplicate} duplicateId={null} />);
      await userEvent.type(screen.getByLabelText(/^name$/i), "Located Spot");
      await userEvent.click(screen.getByRole("button", { name: /use my location/i }));
      expect(onCheckDuplicate).toHaveBeenCalledWith({ name: "Located Spot", lat: 52.123457, lng: 4.765432 });
    } finally {
      restore();
    }
  });
});

describe("PoiFormModal mobile location section", () => {
  it("shows a summary, orders Use my location before Pick on map, and hides coords behind a details toggle", () => {
    const restore = mockMobileMatchMedia();
    const restoreGeo = mockGeolocation({ getCurrentPosition: () => {} });
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9041, lat: 52.3676 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.getByText("52.36760, 4.90410")).toBeInTheDocument();
      const useLocation = screen.getByRole("button", { name: /use my location/i });
      const pickOnMap = screen.getByRole("button", { name: /pick on map/i });
      const positionOf = (el: Element) => Array.from(document.querySelectorAll("button")).indexOf(el as HTMLButtonElement);
      expect(positionOf(useLocation)).toBeLessThan(positionOf(pickOnMap));
      const latInput = screen.getByLabelText(/latitude/i);
      expect(latInput.closest("details")).not.toBeNull();
    } finally {
      restore();
      restoreGeo();
    }
  });

  it("shows 'No location yet' when coordinates are unset", () => {
    const restore = mockMobileMatchMedia();
    try {
      render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.getByText(/no location yet/i)).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

const editInitial = { name: "X", lat: 1, lng: 2, address: null, city: null, country_code: null, category_id: 1, tags: [], notes: null, phone: null, email: null, website: null, image_url: null };

describe("PoiFormModal docked desktop form (Task 2)", () => {
  it("renders the desktop add form docked to the sidebar column with no backdrop", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    const dialog = screen.getByRole("dialog");
    const ancestor = dialog.parentElement as HTMLElement;
    expect(ancestor.style.left).toBe("0px");
    expect(ancestor.style.width).toBe("480px");
    // No element anywhere carries the dark, semi-transparent backdrop fill.
    expect(document.querySelector('[style*="rgba(26,24,22"]')).toBeNull();
  });

  it("keeps the desktop edit form non-modal and outside-click does not close it", async () => {
    const onClose = vi.fn();
    render(<PoiFormModal mode="edit" initial={editInitial} categories={cats} coords={null} onSubmit={() => {}} onClose={onClose} onCheckDuplicate={() => {}} duplicateId={null} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-modal", "true");
    // Click the fixed positioning wrapper outside the dialog panel itself.
    await userEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("is still a true modal on mobile edit", () => {
    const restore = mockMobileMatchMedia();
    try {
      render(<PoiFormModal mode="edit" initial={editInitial} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    } finally {
      restore();
    }
  });

  it("clicking the backdrop closes the mobile edit modal", async () => {
    const restore = mockMobileMatchMedia();
    const onClose = vi.fn();
    try {
      render(<PoiFormModal mode="edit" initial={editInitial} categories={cats} coords={null} onSubmit={() => {}} onClose={onClose} onCheckDuplicate={() => {}} duplicateId={null} />);
      const dialog = screen.getByRole("dialog");
      await userEvent.click(dialog.parentElement as HTMLElement);
      expect(onClose).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("calls onCoordsChange with the initial valid coords, then null after an invalid latitude", async () => {
    const onCoordsChange = vi.fn();
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={{ lng: 4.9, lat: 52.37 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} onCoordsChange={onCoordsChange} />);
    expect(onCoordsChange).toHaveBeenCalledWith({ lat: 52.37, lng: 4.9 });
    onCoordsChange.mockClear();
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: "abc" } });
    expect(onCoordsChange).toHaveBeenCalledWith(null);
  });

  it("updates the latitude field (rounded) when a new coords prop arrives in desktop edit mode", () => {
    const { rerender } = render(<PoiFormModal mode="edit" initial={editInitial} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue("1");
    rerender(<PoiFormModal mode="edit" initial={editInitial} categories={cats} coords={{ lng: 4.9041234, lat: 52.3676543 }} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.367654");
  });

  it("registers a left map inset equal to the sidebar width when coversMap is set", () => {
    const out: { get?: () => Insets } = {};
    function Probe() { out.get = useMapInsetsReader(); return null; }
    render(
      <MapInsetsProvider>
        <Probe />
        <PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} coversMap />
      </MapInsetsProvider>,
    );
    expect(out.get!().left).toBe(480);
  });

  it("registers no map inset when coversMap is not set", () => {
    const out: { get?: () => Insets } = {};
    function Probe() { out.get = useMapInsetsReader(); return null; }
    render(
      <MapInsetsProvider>
        <Probe />
        <PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />
      </MapInsetsProvider>,
    );
    expect(out.get!().left).toBe(0);
  });

  it("shows the drag-the-pin hint on desktop instead of the old click-anywhere hint", () => {
    render(<PoiFormModal mode="add" initial={null} categories={cats} coords={null} onSubmit={() => {}} onClose={() => {}} onCheckDuplicate={() => {}} duplicateId={null} />);
    expect(screen.getByText(/click the map or drag the pin to set the location/i)).toBeInTheDocument();
    expect(screen.queryByText(/click anywhere on the map/i)).not.toBeInTheDocument();
  });
});
