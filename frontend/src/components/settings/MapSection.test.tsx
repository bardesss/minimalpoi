import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import MapSection from "./MapSection";

const FULL = {
  trip_base_url: null, trip_username: null, trip_password_set: false,
  trip_sync_enabled: false, trip_sync_interval_seconds: 300, trip_conflict_policy: "minimalpoi_wins",
  google_api_key_set: false, nominatim_url: null,
  map_tile_url: "https://t.example/s.json", default_map_center_lat: 52, default_map_center_lng: 4,
  default_map_zoom: 11, cookie_secure: false,
};

describe("MapSection", () => {
  it("omits a cleared numeric field instead of sending 0", async () => {
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/settings", () => HttpResponse.json(FULL)),
      http.patch("/api/settings", async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(FULL);
      }),
    );
    renderWithProviders(<MapSection />);
    const lat = await screen.findByLabelText(/default center lat/i);
    await userEvent.clear(lat);
    await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).not.toHaveProperty("default_map_center_lat");
  });
});
