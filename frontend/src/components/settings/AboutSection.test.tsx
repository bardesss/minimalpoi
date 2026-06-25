import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import AboutSection from "./AboutSection";

describe("AboutSection", () => {
  it("shows the current version and an update badge when available", async () => {
    server.use(http.get("/api/version", () => HttpResponse.json({ current: "0.3.0", latest: "0.4.0", update_available: true })));
    renderWithProviders(<AboutSection />);
    expect(await screen.findByText(/v0\.3\.0/)).toBeInTheDocument();
    expect(await screen.findByText(/update available/i)).toBeInTheDocument();
    expect(screen.getByText(/v0\.4\.0/)).toBeInTheDocument();
  });

  it("shows up-to-date when latest is known and not newer", async () => {
    server.use(http.get("/api/version", () => HttpResponse.json({ current: "0.4.0", latest: "0.4.0", update_available: false })));
    renderWithProviders(<AboutSection />);
    expect(await screen.findByText(/up to date/i)).toBeInTheDocument();
  });
});
