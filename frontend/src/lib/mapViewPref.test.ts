import { describe, it, expect, beforeEach, vi } from "vitest";
import { readMapViewMode, writeMapViewMode } from "./mapViewPref";

// Node 22 ships an experimental `localStorage` global that throws unless a
// backing file is configured, and it shadows jsdom's. Stub a real in-memory
// Storage so we exercise the module's read/write logic deterministically.
function makeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe("mapViewPref", () => {
  beforeEach(() => vi.stubGlobal("localStorage", makeStorage()));

  it("defaults to center when nothing is stored", () => {
    expect(readMapViewMode()).toBe("center");
  });

  it("round-trips a written mode through localStorage", () => {
    writeMapViewMode("fit");
    expect(readMapViewMode()).toBe("fit");
    writeMapViewMode("center");
    expect(readMapViewMode()).toBe("center");
  });

  it("falls back to center for an unrecognized stored value", () => {
    localStorage.setItem("minimalpoi.mapView", "garbage");
    expect(readMapViewMode()).toBe("center");
  });
});
