import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { renderWithProviders } from "../test/utils";
import PoiActions from "./PoiActions";

const visit = (over: Record<string, unknown> = {}) => ({ poi_id: 1, user_id: 1, team_id: null, rating: 5, ...over });
const comment = (over: Record<string, unknown> = {}) => ({ id: 9, poi_id: 1, user_id: 1, username: "admin", text: "great", created_at: "2026-06-26T00:00:00Z", ...over });

describe("PoiActions — recording a visit (none yet)", () => {
  it("records a visit by picking a star rating", async () => {
    let put: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([])),
      http.put("/api/pois/1/visit", async ({ request }) => {
        put = await request.json();
        return HttpResponse.json(visit({ rating: 4 }));
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /rate 4/i }));
    await userEvent.click(screen.getByRole("button", { name: /save visit/i }));
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
    await userEvent.click(screen.getByRole("button", { name: /save visit/i }));
    await waitFor(() => expect(posted).toMatchObject({ text: "great" }));
  });

  it("requires a rating before a visit can be saved", async () => {
    server.use(http.get("/api/pois/1/visits", () => HttpResponse.json([])));
    renderWithProviders(<PoiActions poiId={1} />);
    expect(await screen.findByRole("button", { name: /save visit/i })).toBeDisabled();
  });
});

describe("PoiActions — after a visit exists", () => {
  it("hides the visit editor and shows the rating on the comment", async () => {
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ rating: 5 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ text: "great" })])),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await screen.findByText("great");
    await waitFor(() => expect(screen.queryByRole("button", { name: /save visit/i })).not.toBeInTheDocument());
    // rating shown on the (own) comment as interactive re-rate stars
    expect(screen.getByRole("button", { name: /rate 5/i })).toBeInTheDocument();
    // a plain add-a-comment composer remains for further comments
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
  });

  it("re-rates from the comment without re-opening an editor", async () => {
    let put: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ rating: 5 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment()])),
      http.put("/api/pois/1/visit", async ({ request }) => {
        put = await request.json();
        return HttpResponse.json(visit({ rating: 3 }));
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await screen.findByText("great"); // wait for the visited state (editor gone)
    await userEvent.click(screen.getByRole("button", { name: /rate 3/i }));
    await waitFor(() => expect(put).toMatchObject({ rating: 3 }));
  });

  it("removes the visit", async () => {
    let deleted = false;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit()])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment()])),
      http.delete("/api/pois/1/visit", () => { deleted = true; return new HttpResponse(null, { status: 204 }); }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /remove visit/i }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it("posts an additional comment from the composer", async () => {
    let posted: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit()])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment()])),
      http.post("/api/pois/1/comments", async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(comment({ id: 10, text: "again" }), { status: 201 });
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.type(await screen.findByPlaceholderText(/add a comment/i), "again");
    await userEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => expect(posted).toMatchObject({ text: "again" }));
  });

  it("edits an own comment's text inline", async () => {
    let patched: unknown = null;
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit()])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ id: 9, text: "frist" })])),
      http.patch("/api/pois/1/comments/9", async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(comment({ id: 9, text: "fixed typo" }));
      }),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await userEvent.click(await screen.findByRole("button", { name: /edit comment 9/i }));
    const box = screen.getByDisplayValue("frist");
    await userEvent.clear(box);
    await userEvent.type(box, "fixed typo");
    await userEvent.click(screen.getByRole("button", { name: /save comment 9/i }));
    await waitFor(() => expect(patched).toMatchObject({ text: "fixed typo" }));
  });

  it("shows another user's rating read-only and mine interactive", async () => {
    server.use(
      http.get("/api/pois/1/visits", () => HttpResponse.json([visit({ user_id: 1, rating: 5 }), visit({ user_id: 2, rating: 4 })])),
      http.get("/api/pois/1/comments", () => HttpResponse.json([comment({ id: 9, user_id: 1, text: "mine" }), comment({ id: 5, user_id: 2, username: "bob", text: "hi" })])),
    );
    renderWithProviders(<PoiActions poiId={1} />);
    await screen.findByText("hi");
    // bob's rating is read-only
    expect(screen.getByLabelText(/rated 4/i)).toBeInTheDocument();
    // my own rating is interactive
    expect(screen.getByRole("button", { name: /rate 5/i })).toBeInTheDocument();
  });
});
