// @vitest-environment node
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import { DAY_COLOR_EXPRESSION } from "./dayColor";

// MapLibre's real addLayer validation (jsdom-mocked in the rest of the suite,
// so nothing else in this repo exercises it) rejects a colour-typed paint
// property whose expression evaluates to array<string> instead of a colour —
// exactly what a bare ["at", ..., ["literal", [...strings]]] produces. This
// test would fail against that expression and only passes once it's wrapped
// in ["to-color", ...].
function minimalStyle(colorExpr: unknown): StyleSpecification {
  return {
    version: 8,
    sources: {
      pts: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      {
        id: "route-line",
        type: "line",
        source: "pts",
        paint: { "line-color": ["case", ["get", "passed"], "#a8a39b", colorExpr] as never },
      },
      {
        id: "route-points",
        type: "circle",
        source: "pts",
        paint: { "circle-color": colorExpr as never },
      },
      {
        id: "route-point-labels",
        type: "symbol",
        source: "pts",
        paint: { "text-color": colorExpr as never },
      },
    ],
  };
}

describe("DAY_COLOR_EXPRESSION", () => {
  it("validates as a colour expression in line, circle, and symbol paint properties", () => {
    const errors = validateStyleMin(minimalStyle([...DAY_COLOR_EXPRESSION]));
    expect(errors).toEqual([]);
  });
});
