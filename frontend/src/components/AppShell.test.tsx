// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll. This test uses the default
// pois/categories/settings handlers from test/msw.ts. (Later tasks 13/15/18
// extend this file and re-import `server`/`http`/`HttpResponse`/`samplePois`
// when they add per-test `server.use(...)` overrides.)
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/utils";
import AppShell from "./AppShell";

describe("AppShell", () => {
  it("loads POIs into the sidebar list", async () => {
    renderWithProviders(<AppShell />);
    expect(await screen.findByText("Café Modern")).toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
    expect(screen.getByText(/2 places shown/i)).toBeInTheDocument();
  });
});
