import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import MapSection from "./MapSection";

const FULL = {
  google_api_key_set: false, nominatim_url: null,
  map_tile_url: "https://t.example/s.json", default_map_center_lat: 52, default_map_center_lng: 4,
  default_map_zoom: 11, cookie_secure: false, routes_enabled: false,
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
    // The field is populated by an effect after the first paint; wait for the
    // value to land before clearing, else the clear can race the populate and
    // the stale value gets sent (flaky under parallel CI load).
    await waitFor(() => expect(lat).toHaveValue("52"));
    await userEvent.clear(lat);
    await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).not.toHaveProperty("default_map_center_lat");
  });

  it("saves the Route planner toggle", async () => {
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/settings", () => HttpResponse.json(FULL)),
      http.patch("/api/settings", async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...FULL, routes_enabled: true });
      }),
    );
    renderWithProviders(<MapSection />);
    const toggle = await screen.findByRole("checkbox", { name: /route planner/i });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).toHaveProperty("routes_enabled", true);
  });

  describe("enabling secure cookies", () => {
    afterEach(() => vi.restoreAllMocks());

    function stubSettings() {
      let patched: Record<string, unknown> | null = null;
      server.use(
        http.get("/api/settings", () => HttpResponse.json(FULL)),
        http.patch("/api/settings", async ({ request }) => {
          patched = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...FULL, cookie_secure: true });
        }),
      );
      return () => patched;
    }

    // jsdom serves the page over http://localhost, which is exactly the origin
    // where a Secure cookie would be discarded and lock the admin out.
    it("asks for confirmation before turning it on over plain HTTP", async () => {
      const patched = stubSettings();
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      renderWithProviders(<MapSection />);
      const toggle = await screen.findByRole("checkbox", { name: /secure cookie/i });
      await userEvent.click(toggle);
      await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
      expect(confirmSpy.mock.calls[0][0]).toMatch(/https/i);
      expect(patched()).toBeNull();
    });

    it("saves once the warning is accepted", async () => {
      const patched = stubSettings();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      renderWithProviders(<MapSection />);
      await userEvent.click(await screen.findByRole("checkbox", { name: /secure cookie/i }));
      await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
      await waitFor(() => expect(patched()).not.toBeNull());
      expect(patched()).toHaveProperty("cookie_secure", true);
    });

    it("stays out of the way when the setting is not being turned on", async () => {
      const patched = stubSettings();
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      renderWithProviders(<MapSection />);
      await userEvent.click(await screen.findByRole("checkbox", { name: /route planner/i }));
      await userEvent.click(screen.getByRole("button", { name: /save map settings/i }));
      await waitFor(() => expect(patched()).not.toBeNull());
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });
});
