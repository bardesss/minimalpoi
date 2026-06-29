// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { uploadImage } from "./images";

beforeAll(() => {
  Object.defineProperty(globalThis, "location", {
    value: { href: "http://localhost/" },
    configurable: true,
    writable: true,
  });
});

describe("images api", () => {
  it("uploadImage posts multipart and returns the stored url", async () => {
    let contentType = "";
    server.use(
      http.post("/api/images", ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        return HttpResponse.json({ url: "/images/abc.webp" }, { status: 201 });
      }),
    );
    const file = new File(["x"], "p.png", { type: "image/png" });
    const res = await uploadImage(file);
    expect(res.url).toBe("/images/abc.webp");
    expect(contentType).toContain("multipart/form-data");
  });
});
