import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import SyncSection from "./SyncSection";

const CONFLICTS = [
  { entity_type: "place", id: 1, name: "Cafe", trip_id: 5, status: "conflict", last_error: null },
];

describe("SyncSection", () => {
  it("shows status and resolves a conflict with Keep MinimalPOI", async () => {
    let resolved: unknown = null;
    server.use(
      http.get("/api/sync/status", () =>
        HttpResponse.json({ enabled: true, last_run: null, error_count: 0, conflict_count: 1 }),
      ),
      http.get("/api/sync/conflicts", () => HttpResponse.json(CONFLICTS)),
      http.post("/api/sync/resolve", async ({ request }) => {
        resolved = await request.json();
        return HttpResponse.json([]);
      }),
    );
    renderWithProviders(<SyncSection />);
    expect(await screen.findByText("Cafe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /keep minimalpoi/i }));
    await waitFor(() =>
      expect(resolved).toMatchObject({ entity_type: "place", id: 1, resolution: "local" }),
    );
  });

  it("triggers a sync when Sync now is pressed", async () => {
    let synced = false;
    server.use(
      http.get("/api/sync/status", () =>
        HttpResponse.json({ enabled: true, last_run: null, error_count: 0, conflict_count: 0 }),
      ),
      http.get("/api/sync/conflicts", () => HttpResponse.json([])),
      http.post("/api/sync/now", () => {
        synced = true;
        return HttpResponse.json({ ran: true, errors: 0 });
      }),
    );
    renderWithProviders(<SyncSection />);
    await userEvent.click(await screen.findByRole("button", { name: /sync now/i }));
    await waitFor(() => expect(synced).toBe(true));
  });
});
