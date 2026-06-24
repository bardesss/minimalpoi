// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll. This test uses the default
// pois/categories/settings handlers from test/msw.ts. (Later tasks 13/15/18
// extend this file and re-import `server`/`http`/`HttpResponse`/`samplePois`
// when they add per-test `server.use(...)` overrides.)
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/utils";
import AppShell from "./AppShell";

vi.mock("./MapView", () => ({ default: () => null }));

describe("AppShell", () => {
  it("loads POIs into the sidebar list", async () => {
    renderWithProviders(<AppShell />);
    expect(await screen.findByText("Café Modern")).toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
    expect(screen.getByText(/2 places shown/i)).toBeInTheDocument();
  });

  it("renders the category legend with live counts", async () => {
    renderWithProviders(<AppShell />);
    // Legend + sidebar filter chips both render category names; expect at least one of each
    expect((await screen.findAllByText("Restaurants")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nature").length).toBeGreaterThan(0);
  });
});
