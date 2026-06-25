import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { renderWithProviders } from "../test/utils";
import SettingsModal from "./SettingsModal";

describe("SettingsModal", () => {
  it("renders the Data & backups section and a close button", async () => {
    renderWithProviders(<SettingsModal onClose={() => {}} />);
    const dataBtn = await screen.findByRole("button", { name: "Data & backups" });
    expect(dataBtn).toBeInTheDocument();
    await userEvent.click(dataBtn);
    expect(screen.getByText(/Import places/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});

it("hides admin-only sections from members", async () => {
  server.use(http.get("/api/auth/me", () => HttpResponse.json({ id: 2, username: "mem", role: "member", preferred_team_id: null, disabled: false, created_at: "2026-06-23T00:00:00Z" })));
  renderWithProviders(<SettingsModal onClose={() => {}} />);
  expect(await screen.findByRole("button", { name: "Data & backups" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Connections" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Map" })).not.toBeInTheDocument();
});
