import { afterEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "./download";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("triggerDownload", () => {
  it("creates an object URL, clicks an anchor, and revokes the URL on the next tick", () => {
    vi.useFakeTimers();
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    triggerDownload(new Blob(["x"]), "places.geojson");
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    // Revoke is deferred so the browser can start the download first.
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:fake");
  });
});
