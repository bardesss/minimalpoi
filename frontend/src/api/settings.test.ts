import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { getFullSettings, updateSettings } from "./settings";

describe("settings api", () => {
  it("getFullSettings fetches the full settings object", async () => {
    server.use(
      http.get("/api/settings", () =>
        HttpResponse.json({
          google_api_key_set: false, nominatim_url: "https://nom.example",
          map_tile_url: "https://tiles.example/s.json", default_map_center_lat: 52, default_map_center_lng: 4,
          default_map_zoom: 11, cookie_secure: false,
        }),
      ),
    );
    const s = await getFullSettings();
    expect(s.google_api_key_set).toBe(false);
    expect(s.nominatim_url).toBe("https://nom.example");
  });

  it("updateSettings PATCHes only provided fields", async () => {
    let received: unknown = null;
    server.use(
      http.patch("/api/settings", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ nominatim_url: "x" });
      }),
    );
    await updateSettings({ nominatim_url: "https://nom.example" });
    expect(received).toEqual({ nominatim_url: "https://nom.example" });
  });
});
