import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";

describe("decodePolyline", () => {
  it("decodes Google's canonical example to [lng,lat] pairs", () => {
    // The reference string from Google's Encoded Polyline Algorithm docs.
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC")).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});
