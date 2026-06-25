import { afterEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "./download";

afterEach(() => vi.restoreAllMocks());

describe("triggerDownload", () => {
  it("creates an object URL, clicks an anchor, and revokes the URL", () => {
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    triggerDownload(new Blob(["x"]), "places.geojson");
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:fake");
  });
});
