import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const adminUser = {
  id: 1,
  username: "admin",
  role: "admin",
  preferred_team_id: null,
  disabled: false,
  created_at: "2026-06-23T00:00:00Z",
};

export const handlers = [
  http.get("/api/auth/setup-status", () => HttpResponse.json({ needs_setup: false })),
  http.get("/api/auth/me", () => HttpResponse.json(adminUser)),
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    if (body.password === "good") return HttpResponse.json({ ...adminUser, username: body.username });
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),
  http.post("/api/auth/setup", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    return HttpResponse.json({ ...adminUser, username: body.username }, { status: 201 });
  }),
  http.post("/api/auth/logout", () => HttpResponse.json({ status: "ok" })),
];

export const server = setupServer(...handlers);
