import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { renderWithProviders } from "../test/utils";
import PoiActions from "./PoiActions";

describe("PoiActions", () => {
  it("records a visit by picking a star rating", async () => {
    let put: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.put("/api/pois/1/visit", async ({ request }) => {
        put = await request.json();
        return HttpResponse.json({ poi_id: 1, user_id: 1, team_id: null, rating: 4 });
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /rate 4/i }));
    await userEvent.click(screen.getByRole("button", { name: /save visit/i }));
    await waitFor(() => expect(put).toMatchObject({ rating: 4 }));
  });

  it("saves a rating together with an optional comment", async () => {
    let put: unknown = null;
    let posted: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.put("/api/pois/1/visit", async ({ request }) => {
        put = await request.json();
        return HttpResponse.json({ poi_id: 1, user_id: 1, team_id: null, rating: 5 });
      }),
      http.get("/api/pois/1/comments", () => HttpResponse.json([])),
      http.post("/api/pois/1/comments", async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { id: 9, poi_id: 1, user_id: 1, username: "admin", text: "great", created_at: "2026-06-26T00:00:00Z" },
          { status: 201 },
        );
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /rate 5/i }));
    await userEvent.type(screen.getByPlaceholderText(/add a comment/i), "great");
    await userEvent.click(screen.getByRole("button", { name: /save visit/i }));
    await waitFor(() => expect(posted).toMatchObject({ text: "great" }));
    expect(put).toMatchObject({ rating: 5 });
  });

  it("requires a rating before a visit can be saved", async () => {
    server.use(http.get("/api/pois/1/visits", () => HttpResponse.json([])));
    renderWithProviders(<PoiActions poiId={1} />);
    expect(await screen.findByRole("button", { name: /save visit/i })).toBeDisabled();
  });
});
