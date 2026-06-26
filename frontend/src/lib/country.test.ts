import { describe, expect, it } from "vitest";
import { cityFromAddress, countryCodeFromAddress, countryCodeFromName } from "./country";

describe("countryCodeFromName", () => {
  it("resolves English, Dutch, German, and French names", () => {
    expect(countryCodeFromName("Netherlands")).toBe("NL");
    expect(countryCodeFromName("Nederland")).toBe("NL");
    expect(countryCodeFromName("Deutschland")).toBe("DE");
    expect(countryCodeFromName("Belgique")).toBe("BE");
  });
  it("returns null for unknown / empty input", () => {
    expect(countryCodeFromName("Atlantis")).toBeNull();
    expect(countryCodeFromName(null)).toBeNull();
  });
});

describe("countryCodeFromAddress", () => {
  it("reads the country from the address tail", () => {
    expect(countryCodeFromAddress("Hoofddorpplein 1, 1059 CV Amsterdam, Netherlands")).toBe("NL");
    expect(countryCodeFromAddress("Street 12, Amsterdam")).toBeNull();
  });
});

describe("cityFromAddress", () => {
  it("uses the segment before the country and strips a postal code", () => {
    expect(cityFromAddress("Hoofddorpplein 1, 1059 CV Amsterdam, Netherlands")).toBe("Amsterdam");
    expect(cityFromAddress("Friedrichstraße 1, 10117 Berlin, Germany")).toBe("Berlin");
  });
  it("uses the last segment when there is no country", () => {
    expect(cityFromAddress("Street 12, Amsterdam")).toBe("Amsterdam");
    expect(cityFromAddress(null)).toBe("");
  });
});
