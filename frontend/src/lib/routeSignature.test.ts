import { describe, expect, it } from "vitest";
import { routeSignature } from "./routeSignature";

const A = { id: 1, lat: 52.37, lng: 4.9 };
const B = { id: 2, lat: 48.85, lng: 2.35 };

describe("routeSignature", () => {
  it("is equal for two different array instances with the same ids and coords", () => {
    expect(routeSignature([A, B])).toBe(routeSignature([{ ...A }, { ...B }]));
  });

  it("changes when a coordinate changes", () => {
    expect(routeSignature([A, B])).not.toBe(routeSignature([A, { ...B, lat: 48.86 }]));
  });

  it("changes when an id changes", () => {
    expect(routeSignature([A, B])).not.toBe(routeSignature([A, { ...B, id: 3 }]));
  });

  it("changes when a node is added or removed", () => {
    expect(routeSignature([A, B])).not.toBe(routeSignature([A]));
  });

  it("is order-sensitive (reordering the chain reframes)", () => {
    expect(routeSignature([A, B])).not.toBe(routeSignature([B, A]));
  });

  it("returns an empty string for no nodes", () => {
    expect(routeSignature([])).toBe("");
  });
});
