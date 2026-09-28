import { afterEach, describe, expect, it, vi } from "vitest";
import { readListDensity, writeListDensity } from "./listDensityPref";

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("listDensityPref", () => {
  it("is null until chosen, then round-trips", () => {
    expect(readListDensity()).toBeNull();
    writeListDensity("list");
    expect(readListDensity()).toBe("list");
    writeListDensity("cards");
    expect(readListDensity()).toBe("cards");
  });
  it("ignores garbage and storage errors", () => {
    localStorage.setItem("minimalpoi.listDensity", "tiles");
    expect(readListDensity()).toBeNull();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readListDensity()).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => writeListDensity("list")).not.toThrow();
  });
});
