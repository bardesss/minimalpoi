// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll. This test uses the default
// pois/categories/settings handlers from test/msw.ts. (Later tasks 13/15/18
// extend this file and re-import `server`/`http`/`HttpResponse`/`samplePois`
// when they add per-test `server.use(...)` overrides.)
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/utils";
import AppShell from "./AppShell";

const mapPropsSpy = vi.fn();
vi.mock("./MapView", () => ({ default: (props: { pois: { id: number }[] }) => { mapPropsSpy(props.pois); return null; } }));

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

  it("search narrows both the list and the map source", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.type(screen.getByLabelText(/search places/i), "vondel");
    expect(screen.queryByText("Café Modern")).not.toBeInTheDocument();
    expect(screen.getByText("Vondelpark")).toBeInTheDocument();
    expect(screen.getByText(/1 place shown/i)).toBeInTheDocument();
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
});
