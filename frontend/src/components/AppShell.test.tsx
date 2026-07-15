// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll. This test uses the default
// pois/categories/settings handlers from test/msw.ts. (Later tasks 13/15/18
// extend this file and re-import `server`/`http`/`HttpResponse`/`samplePois`
// when they add per-test `server.use(...)` overrides.)
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../test/utils";
import { server, samplePois, sampleSettings } from "../test/msw";
import AppShell from "./AppShell";

const mapPropsSpy = vi.fn();
vi.mock("./MapView", () => ({ default: (props: { pois: { id: number }[] }) => { mapPropsSpy(props.pois); return null; } }));

describe("AppShell", () => {
  it("loads POIs into the sidebar list", async () => {
    renderWithProviders(<AppShell />);
    expect(await screen.findByText("Café Modern")).toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
    expect(screen.getByText(/2 places/i)).toBeInTheDocument();
  });

  it("renders the category legend with live counts", async () => {
    renderWithProviders(<AppShell />);
    // Legend + sidebar filter chips both render category names; expect at least one of each
    expect((await screen.findAllByText("Restaurants")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nature").length).toBeGreaterThan(0);
  });

  it("search narrows both the list and the map source", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.type(screen.getByLabelText(/search places/i), "vondel");
    expect(screen.queryByText("Café Modern")).not.toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
    expect(screen.getByText(/1 place/i)).toBeInTheDocument();
    const calls = mapPropsSpy.mock.calls;
    const lastPois = calls[calls.length - 1][0] as { id: number }[];
    expect(lastPois.map((p) => p.id)).toEqual([2]);
  });

  it("category chip filters the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    // Filter chip for Nature has aria-pressed attribute (to distinguish from POI card category names)
    await user.click(screen.getByRole("button", { name: /nature/i, pressed: false }));
    expect(screen.queryByText("Café Modern")).not.toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
  });

  it("creates a place and selects it", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/pois", async ({ request }) => {
        const body = (await request.json()) as { name: string; lat: number; lng: number };
        return HttpResponse.json({ ...samplePois[0], id: 99, name: body.name, lat: body.lat, lng: body.lng }, { status: 201 });
      }),
      http.get("/api/pois", () => HttpResponse.json([...samplePois, { ...samplePois[0], id: 99, name: "Created Place" }])),
    );
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
    await user.type(screen.getByLabelText(/^name$/i), "Created Place");
    await user.type(screen.getByLabelText(/latitude/i), "52.37");
    await user.type(screen.getByLabelText(/longitude/i), "4.9");
    await user.click(screen.getByRole("button", { name: /^add place$/i })); // submit
    // After creation the invalidated GET returns "Created Place"; it appears in sidebar + detail panel
    expect((await screen.findAllByText("Created Place")).length).toBeGreaterThan(0);
  });

  it("hides the Routes nav when routes_enabled is false", async () => {
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    expect(screen.queryByRole("link", { name: /routes/i })).not.toBeInTheDocument();
  });

  it("shows the Routes nav when routes_enabled is true", async () => {
    server.use(
      http.get("/api/settings/map", () =>
        HttpResponse.json({ ...sampleSettings, routes_enabled: true }),
      ),
    );
    renderWithProviders(<AppShell />);
    const link = await screen.findByRole("link", { name: /routes/i });
    expect(link).toHaveAttribute("href", "/routes");
  });

  it("deletes a place and closes the detail panel", async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.delete("/api/pois/:id", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get("/api/pois", () =>
        HttpResponse.json(deleted ? [samplePois[1]] : samplePois),
      ),
    );
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    // Open detail panel by clicking the card in the sidebar
    await user.click(screen.getByRole("button", { name: /café modern/i }));
    // Wait for the detail panel heading to appear
    expect(await screen.findByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    // Click Delete (first click shows confirm)
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    // Click Confirm delete
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));
    // Detail panel should close
    expect(screen.queryByRole("heading", { name: "Café Modern" })).not.toBeInTheDocument();
  });
});
