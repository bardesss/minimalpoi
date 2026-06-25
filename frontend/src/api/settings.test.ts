import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { getFullSettings, updateSettings } from "./settings";

describe("settings api", () => {
  it("getFullSettings fetches the full settings object", async () => {
    server.use(
      http.get("/api/settings", () =>
        HttpResponse.json({
          trip_base_url: "https://trip.example", trip_username: "u", trip_password_set: true,
          trip_sync_enabled: false, trip_sync_interval_seconds: 300, trip_conflict_policy: "minimalpoi_wins",
          google_api_key_set: false, nominatim_url: "https://nom.example",
          map_tile_url: "https://tiles.example/s.json", default_map_center_lat: 52, default_map_center_lng: 4,
          default_map_zoom: 11, cookie_secure: false,
        }),
      ),
    );
    const s = await getFullSettings();
    expect(s.trip_password_set).toBe(true);
    expect(s.trip_conflict_policy).toBe("minimalpoi_wins");
  });

  it("updateSettings PATCHes only provided fields", async () => {
    let received: unknown = null;
    server.use(
      http.patch("/api/settings", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ trip_base_url: "x" });
      }),
    );
    await updateSettings({ trip_password: "secret" });
    expect(received).toEqual({ trip_password: "secret" });
  });
});
