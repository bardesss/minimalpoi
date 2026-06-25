import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import TeamsSection from "./TeamsSection";

describe("TeamsSection", () => {
  it("lists teams and creates one with a member", async () => {
    let created: unknown = null;
    server.use(
      http.get("/api/teams", () => HttpResponse.json([{ id: 1, name: "Crew", created_by: 1, member_ids: [] }])),
      http.get("/api/teams/candidates", () => HttpResponse.json([{ id: 1, username: "admin" }, { id: 2, username: "bob" }])),
      http.post("/api/teams", async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ id: 2, name: "Scouts", created_by: 1, member_ids: [2] }, { status: 201 });
      }),
    );
    renderWithProviders(<TeamsSection />);
    expect(await screen.findByText("Crew")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add team/i }));
    await userEvent.type(screen.getByLabelText(/team name/i), "Scouts");
    await userEvent.click(screen.getByLabelText(/member bob/i));
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(created).toMatchObject({ name: "Scouts", member_ids: [1, 2] }));
  });
});
