import { useState } from "react";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { renderWithProviders } from "../test/utils";
import PoiActions from "./PoiActions";

const visit = (over: Record<string, unknown> = {}) => ({ poi_id: 1, user_id: 1, team_id: null, rating: 5, ...over });
const comment = (over: Record<string, unknown> = {}) => ({ id: 9, poi_id: 1, user_id: 1, username: "admin", text: "great", created_at: "2026-06-26T00:00:00Z", ...over });

describe("PoiActions — no review yet", () => {
  it("saves a review by picking a star rating", async () => {
    let put: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([])),
      http.put("/api/pois/1/visit", async ({ request }) => {
        put = await request.json();
        return HttpResponse.json(visit({ rating: 4 }));
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /rate 4/i }));
    await userEvent.click(screen.getByRole("button", { name: /save review/i }));
    await waitFor(() => expect(put).toMatchObject({ rating: 4 }));
  });

  it("saves a rating together with an optional comment", async () => {
    let posted: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.put("/api/pois/1/visit", () => HttpResponse.json(visit())),
      http.get("/api/pois/1/comments", () => HttpResponse.json([])),
      http.post("/api/pois/1/comments", async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(comment({ text: "great" }), { status: 201 });
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /rate 5/i }));
    await userEvent.type(screen.getByPlaceholderText(/share a comment/i), "great");
    await userEvent.click(screen.getByRole("button", { name: /save review/i }));
    await waitFor(() => expect(posted).toMatchObject({ text: "great" }));
  });

  it("requires a rating before a review can be saved", async () => {
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([])),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    expect(await screen.findByRole("button", { name: /save review/i })).toBeDisabled();
  });

  it("resets the draft when you navigate to a different POI", async () => {
    // Both POIs are unreviewed, so the editor shows for each.
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([])),
      http.get("/api/pois/2/visits", () => HttpResponse.json([])),
      http.get("/api/pois/2/comments", () => HttpResponse.json([])),
    );
    function Harness() {
      const [id, setId] = useState(1);
      return (
        <>
          <button type="button" onClick={() => setId(2)}>switch</button>
          <PoiActions poiId={id} />
        </>
      );
    }
    renderWithProviders(<Harness />);
    // Start a review on POI 1 without saving.
    await userEvent.click(await screen.findByRole("button", { name: /rate 5/i }));
    await userEvent.type(screen.getByPlaceholderText(/share a comment/i), "stale draft");
    expect(screen.getByRole("button", { name: /save review/i })).toBeEnabled();
    // Navigate to POI 2 — the draft must not carry over.
    await userEvent.click(screen.getByRole("button", { name: "switch" }));
    await waitFor(() => expect(screen.getByPlaceholderText(/share a comment/i)).toHaveValue(""));
    expect(screen.getByRole("button", { name: /save review/i })).toBeDisabled();
  });
});

describe("PoiActions — after a review exists", () => {
  it("shows your review as one row (read-only stars + text), editor hidden", async () => {
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ rating: 5 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ text: "great" })])),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await screen.findByText("great");
    expect(screen.queryByRole("button", { name: /save review/i })).not.toBeInTheDocument();
    // No interactive picker and no separate composer until you edit.
    expect(screen.queryByRole("button", { name: /rate 5/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/rated 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete review$/i })).toBeInTheDocument();
  });

  it("edits rating and text together", async () => {
    let put: unknown = null;
    let patched: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ rating: 5 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ id: 9, text: "great" })])),
      http.put("/api/pois/1/visit", async ({ request }) => { put = await request.json(); return HttpResponse.json(visit({ rating: 3 })); }),
      http.patch("/api/pois/1/comments/9", async ({ request }) => { patched = await request.json(); return HttpResponse.json(comment({ id: 9, text: "even better" })); }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /edit review/i }));
    await userEvent.click(screen.getByRole("button", { name: /rate 3/i }));
    const box = screen.getByDisplayValue("great");
    await userEvent.clear(box);
    await userEvent.type(box, "even better");
    await userEvent.click(screen.getByRole("button", { name: /save review/i }));
    await waitFor(() => expect(put).toMatchObject({ rating: 3 }));
    await waitFor(() => expect(patched).toMatchObject({ text: "even better" }));
  });

  it("deletes the whole review (rating + comment) in one action", async () => {
    let visitDeleted = false;
    let commentDeleted = false;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit()])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ id: 9 })])),
      http.delete("/api/pois/1/visit", () => { visitDeleted = true; return new HttpResponse(null, { status: 204 }); }),
      http.delete("/api/pois/1/comments/9", () => { commentDeleted = true; return new HttpResponse(null, { status: 204 }); }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /^delete review$/i }));
    await waitFor(() => expect(visitDeleted).toBe(true));
    await waitFor(() => expect(commentDeleted).toBe(true));
  });

  it("shows another person's review read-only; admin can delete it", async () => {
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ user_id: 1, rating: 5 }), visit({ user_id: 2, rating: 4 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ id: 9, user_id: 1, text: "mine" }), comment({ id: 5, user_id: 2, username: "bob", text: "hi" })])),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await screen.findByText("hi");
    expect(screen.getByLabelText(/rated 4/i)).toBeInTheDocument();
    // bob's review has no Edit button (not mine)
    expect(screen.queryByRole("button", { name: /edit review/i })).toBeInTheDocument(); // mine has Edit
    expect(screen.getByRole("button", { name: /delete bob's review/i })).toBeInTheDocument();
  });
});
