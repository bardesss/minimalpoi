import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server, sampleSettings } from "../test/msw";
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

it("hides the Sync tab for an admin until TRIP is configured", async () => {
  // Default /api/settings has no trip_base_url → Sync is useless, so hide it.
  renderWithProviders(<SettingsModal onClose={() => {}} />);
  expect(await screen.findByRole("button", { name: "Connections" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Sync" })).not.toBeInTheDocument();
});

it("shows the Sync tab once a TRIP base URL is set", async () => {
  server.use(http.get("/api/settings", () => HttpResponse.json({ ...sampleSettings, trip_base_url: "https://trip.example" })));
  renderWithProviders(<SettingsModal onClose={() => {}} />);
  expect(await screen.findByRole("button", { name: "Sync" })).toBeInTheDocument();
});
