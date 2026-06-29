// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { downloadBackup, restoreBackup } from "./backup";

beforeAll(() => {
  Object.defineProperty(globalThis, "location", {
    value: { href: "http://localhost/" },
    configurable: true,
    writable: true,
  });
});

describe("backup api", () => {
  it("downloadBackup returns a Blob", async () => {
    server.use(
      http.get("/api/backup", () =>
        HttpResponse.arrayBuffer(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer, {
          headers: { "Content-Type": "application/zip" },
        }),
      ),
    );
    const blob = await downloadBackup();
    expect(blob).toBeInstanceOf(Blob);
  });

  it("restoreBackup posts multipart and returns the summary", async () => {
    let contentType = "";
    server.use(
      http.post("/api/restore", ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        return HttpResponse.json({ restored: { pois: 2 } });
      }),
    );
    const res = await restoreBackup(new File(["x"], "b.zip", { type: "application/zip" }));
    expect(res.restored.pois).toBe(2);
    expect(contentType).toContain("multipart/form-data");
  });
});
