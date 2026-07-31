import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import ConnectionsSection from "./ConnectionsSection";

const FULL = {
  trip_base_url: "https://trip.example", trip_username: "u", trip_password_set: true,
  trip_sync_enabled: false, trip_sync_interval_seconds: 300, trip_conflict_policy: "minimalpoi_wins",
  google_api_key_set: false, nominatim_url: "https://nom.example",
  map_tile_url: "https://t.example/s.json", default_map_center_lat: 52, default_map_center_lng: 4,
  default_map_zoom: 11, cookie_secure: false,
};

describe("ConnectionsSection", () => {
  it("sends a secret only when entered", async () => {
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/settings", () => HttpResponse.json(FULL)),
      http.patch("/api/settings", async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(FULL);
      }),
    );
    renderWithProviders(<ConnectionsSection />);
    await screen.findByDisplayValue("https://trip.example");
    await userEvent.type(screen.getByLabelText(/google api key/i), "newkey");
    await userEvent.click(screen.getByRole("button", { name: /save connections/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).toMatchObject({ google_api_key: "newkey" });
    expect(patched).not.toHaveProperty("trip_password"); // untouched secret not sent
    expect(await screen.findByText(/connections saved/i)).toBeInTheDocument(); // save feedback
  });

  it("shows an error toast when the save fails", async () => {
    server.use(
      http.get("/api/settings", () => HttpResponse.json(FULL)),
      http.patch("/api/settings", () => HttpResponse.json({ detail: "nope" }, { status: 500 })),
    );
    renderWithProviders(<ConnectionsSection />);
    await screen.findByDisplayValue("https://trip.example");
    await userEvent.click(screen.getByRole("button", { name: /save connections/i }));
    expect(await screen.findByText(/nope/i)).toBeInTheDocument();
  });
});
