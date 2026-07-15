import { describe, expect, it } from "vitest";
import { toPoiCreate } from "./NodePicker";
import type { PoiDraft } from "../../types/api";

const draft: PoiDraft = {
  name: "Taco Lindo", address: "Main St 1", city: "Austin", country_code: "US",
  lat: 30.27, lng: -97.74, image_url: null, description: "great tacos",
  phone: "+1512", website: "https://taco.example", source_url: null, field_sources: {},
};

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
