import { describe, expect, it } from "vitest";
import { directionsUrl, isApplePlatform } from "./placeLinks";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0";

describe("isApplePlatform", () => {
  it("detects iOS, iPadOS and macOS", () => {
    expect(isApplePlatform(IPHONE)).toBe(true);
    expect(isApplePlatform(MAC)).toBe(true);
  });
  it("is false elsewhere", () => {
    expect(isApplePlatform(ANDROID)).toBe(false);
    expect(isApplePlatform("")).toBe(false);
  });
});

describe("directionsUrl", () => {
  it("uses Apple Maps on Apple platforms", () => {
    expect(directionsUrl(52.358, 4.8686, true)).toBe("https://maps.apple.com/?daddr=52.358,4.8686");
  });
  it("uses Google Maps elsewhere", () => {
    expect(directionsUrl(52.358, 4.8686, false)).toBe("https://www.google.com/maps/dir/?api=1&destination=52.358,4.8686");
  });
});
