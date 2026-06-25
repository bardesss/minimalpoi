import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import UsersSection from "./UsersSection";

const USERS = [
  { id: 1, username: "admin", role: "admin", preferred_team_id: null, disabled: false, created_at: "2026-06-25T00:00:00Z" },
  { id: 2, username: "bob", role: "member", preferred_team_id: null, disabled: false, created_at: "2026-06-25T00:00:00Z" },
];

describe("UsersSection", () => {
  it("lists users and creates a new one", async () => {
    let created: unknown = null;
    server.use(
      http.get("/api/users", () => HttpResponse.json(USERS)),
      http.post("/api/users", async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ id: 3, username: "carol", role: "member", preferred_team_id: null, disabled: false, created_at: "2026-06-25T00:00:00Z" }, { status: 201 });
      }),
    );
    renderWithProviders(<UsersSection />);
    expect(await screen.findByText("bob")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));
    await userEvent.type(screen.getByLabelText(/^username$/i), "carol");
    await userEvent.type(screen.getByLabelText(/^password$/i), "pw123");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(created).toMatchObject({ username: "carol", role: "member" }));
  });
});
