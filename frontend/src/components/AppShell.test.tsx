// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll. This test uses the default
// pois/categories/settings handlers from test/msw.ts. (Later tasks 13/15/18
// extend this file and re-import `server`/`http`/`HttpResponse`/`samplePois`
// when they add per-test `server.use(...)` overrides.)
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders, stubMediaQueries } from "../test/utils";
import { server, samplePois, sampleSettings } from "../test/msw";
import AppShell from "./AppShell";

const mapPropsSpy = vi.fn();
const mapHighlightSpy = vi.fn();
const mapViewPropsSpy = vi.fn();
vi.mock("./MapView", () => ({
  default: (props: {
    pois: { id: number }[];
    highlightId?: number | null;
    addMode: boolean;
    draftPin?: { lng: number; lat: number } | null;
    onDraftPinMove?: (c: { lng: number; lat: number }) => void;
  }) => {
    mapPropsSpy(props.pois);
    mapHighlightSpy(props.highlightId ?? null);
    mapViewPropsSpy(props);
    return null;
  },
}));

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
    expect(screen.getByText(/1 place\b/i)).toBeInTheDocument();
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

  it("focuses search after the '/' hotkey re-expands a collapsed sidebar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    // Collapse the sidebar — this unmounts the search input entirely.
    await user.click(screen.getByRole("button", { name: /collapse panel/i }));
    expect(screen.queryByLabelText(/search places/i)).not.toBeInTheDocument();
    // Fire the global hotkey; the sidebar (and #poi-search) re-mounts, and
    // focus should land on the search input once it does.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
    });
    const search = await screen.findByLabelText(/search places/i);
    await waitFor(() => expect(search).toHaveFocus());
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
    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("menuitem", { name: /delete place/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    // Detail panel should close
    expect(screen.queryByRole("heading", { name: "Café Modern" })).not.toBeInTheDocument();
  });

  it("preselects a POI from the ?place= deep-link", async () => {
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    // DetailPanel is unique in exposing an "Edit place" button; the sidebar card also shows the name, so assert on the panel-only control.
    expect(await screen.findByRole("button", { name: /edit place/i })).toBeInTheDocument();
  });

  it("keeps the selected place open even when search filters it out of the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    // Detail panel for POI 1 (Café Modern) is open — the panel-only "Edit place" button.
    expect(await screen.findByRole("button", { name: /edit place/i })).toBeInTheDocument();
    // Type a query that matches nothing; the sidebar list empties but selection persists.
    await user.type(screen.getByLabelText(/search places/i), "zzzznomatch");
    expect(screen.getByRole("button", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
  });
});

describe("AppShell detail placement", () => {
  let restore: (() => void) | null = null;
  afterEach(() => { restore?.(); restore = null; });

  it("narrow desktop: shows the detail inside the sidebar, hiding the list, and returns to it", async () => {
    restore = stubMediaQueries((q) => q === "(min-width: 769px) and (max-width: 1279px)");
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    const back = await screen.findByRole("button", { name: /back to list/i });
    expect(screen.getByLabelText(/search places/i).closest("[inert]")).not.toBeNull();
    await user.click(back);
    expect(screen.queryByRole("button", { name: /back to list/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/search places/i).closest("[inert]")).toBeNull();
  });

  it("mobile: shows the detail sheet and hides the list sheet", async () => {
    restore = stubMediaQueries((q) => q === "(max-width: 768px)");
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    expect(await screen.findByRole("separator", { name: /drag to resize details/i })).toBeInTheDocument();
    // The hidden list sheet's separator keeps its aria-label, but an
    // aria-hidden ancestor blanks its computed accessible name — so it can't
    // be found by accessible name here; look it up by the attribute instead.
    const listHandle = document.querySelector('[aria-label="Drag to resize list"]') as HTMLElement;
    expect(listHandle).not.toBeNull();
    expect(listHandle.closest("section")).toHaveAttribute("inert");
  });

  it("wide desktop (default): keeps the overlay panel", async () => {
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    expect(await screen.findByRole("button", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /back to list/i })).not.toBeInTheDocument();
  });

  it("narrow desktop: the '/' hotkey closes the in-sidebar detail and focuses search", async () => {
    restore = stubMediaQueries((q) => q === "(min-width: 769px) and (max-width: 1279px)");
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    await screen.findByRole("button", { name: /back to list/i });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: /back to list/i })).not.toBeInTheDocument());
    const search = screen.getByLabelText(/search places/i);
    expect(search.closest("[inert]")).toBeNull();
    await waitFor(() => expect(search).toHaveFocus());
  });

  it("mobile: focusing a list card does not highlight its pin", async () => {
    restore = stubMediaQueries((q) => q === "(max-width: 768px)");
    renderWithProviders(<AppShell />);
    const card = (await screen.findByText("Café Modern")).closest("button") as HTMLElement;
    mapHighlightSpy.mockClear();
    act(() => { card.focus(); });
    expect(mapHighlightSpy).not.toHaveBeenCalledWith(1);
  });
});

describe("AppShell draft pin", () => {
  afterEach(() => {
    mapViewPropsSpy.mockClear();
  });

  it("follows typed lat/lng while adding a place on desktop", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
    await user.type(screen.getByLabelText(/latitude/i), "52.4");
    await user.type(screen.getByLabelText(/longitude/i), "4.95");
    await waitFor(() => {
      const last = mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0];
      expect(last.draftPin).toEqual({ lat: 52.4, lng: 4.95 });
    });
  });

  it("updates the form latitude when the map reports a dragged draft pin", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
    const last = mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0] as {
      onDraftPinMove?: (c: { lng: number; lat: number }) => void;
    };
    act(() => {
      last.onDraftPinMove?.({ lng: 4.95, lat: 52.4 });
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.4");
    });
  });

  it("clears the draft pin when the form is closed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
    await user.type(screen.getByLabelText(/latitude/i), "52.4");
    await user.type(screen.getByLabelText(/longitude/i), "4.95");
    await waitFor(() => {
      const last = mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0];
      expect(last.draftPin).toEqual({ lat: 52.4, lng: 4.95 });
    });
    await user.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => {
      const last = mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0];
      expect(last.draftPin).toBeNull();
    });
  });

  it("never shows a draft pin on mobile", async () => {
    const restore = stubMediaQueries((q) => q === "(max-width: 768px)");
    try {
      const user = userEvent.setup();
      renderWithProviders(<AppShell />);
      await screen.findByText("Café Modern");
      await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
      await user.type(screen.getByLabelText(/latitude/i), "52.4");
      await user.type(screen.getByLabelText(/longitude/i), "4.95");
      await waitFor(() => {
        expect(screen.getByLabelText(/latitude/i)).toHaveValue("52.4");
      });
      const last = mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0];
      expect(last.draftPin).toBeNull();
    } finally {
      restore();
    }
  });
});

describe("AppShell docked edit form (desktop)", () => {
  let restore: (() => void) | null = null;
  afterEach(() => { restore?.(); restore = null; mapViewPropsSpy.mockClear(); });

  // Records every PATCH/POST to /api/pois so a test can prove which place a
  // save hit (and that it didn't create a copy).
  function recordWrites() {
    const writes: string[] = [];
    server.use(
      http.patch("/api/pois/:id", async ({ params, request }) => {
        writes.push(`PATCH ${params.id as string}`);
        const body = (await request.json()) as { name?: string };
        const base = samplePois.find((p) => p.id === Number(params.id)) ?? samplePois[0];
        return HttpResponse.json({ ...base, ...body });
      }),
      http.post("/api/pois", async ({ request }) => {
        writes.push("POST");
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ ...samplePois[0], id: 99, name: body.name }, { status: 201 });
      }),
    );
    return writes;
  }

  function lastMapProps() {
    return mapViewPropsSpy.mock.calls[mapViewPropsSpy.mock.calls.length - 1][0] as {
      onSelect: (id: number) => void;
      addMode: boolean;
    };
  }

  it("saves the edited place even if another place gets selected mid-edit", async () => {
    const writes = recordWrites();
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    await user.click(await screen.findByRole("button", { name: /edit place/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Café Modern");
    // Selection changes underneath the open form (e.g. a list/map selection).
    act(() => { lastMapProps().onSelect(2); });
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(writes).toEqual(["PATCH 1"]));
  });

  it("hides the detail panel while the desktop form is open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    expect(await screen.findByRole("heading", { name: "Café Modern" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /edit place/i }));
    expect(screen.getByRole("heading", { name: /edit place/i })).toBeInTheDocument();
    // Only the docked form remains: no overlay detail (and so no second left
    // map inset stacked on top of the form's).
    expect(screen.queryByRole("heading", { name: "Café Modern" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit place/i })).not.toBeInTheDocument();
  });

  it("narrow desktop: the search hotkey neither closes the form nor retargets the save", async () => {
    restore = stubMediaQueries((q) => q === "(min-width: 769px) and (max-width: 1279px)");
    const writes = recordWrites();
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    await screen.findByRole("button", { name: /back to list/i });
    await user.click(screen.getByRole("button", { name: /edit place/i }));
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(screen.getByRole("heading", { name: /edit place/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(writes).toEqual(["PATCH 1"]));
  });

  it("narrow desktop: hides the add button while editing", async () => {
    restore = stubMediaQueries((q) => q === "(min-width: 769px) and (max-width: 1279px)");
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    await screen.findByRole("button", { name: /back to list/i });
    await user.click(screen.getByRole("button", { name: /edit place/i }));
    expect(screen.getByRole("heading", { name: /edit place/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add place/i })).not.toBeInTheDocument();
  });

  it("hides the add button while adding (only the form's submit remains)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    await user.click(screen.getByRole("button", { name: /add place/i })); // FAB
    const matches = screen.getAllByRole("button", { name: /add place/i });
    expect(matches).toHaveLength(1);
    expect(matches[0]).toHaveAttribute("type", "submit");
  });
});

describe("AppShell Slice C", () => {
  let restore: (() => void) | null = null;
  afterEach(() => { restore?.(); restore = null; });

  it("shows the category legend only while the sidebar is collapsed (desktop)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    await screen.findByText("Café Modern");
    expect(screen.queryByText(/^categories$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /collapse panel/i }));
    expect(await screen.findByText(/^categories$/i)).toBeInTheDocument();
  });

  it("hides the add button while the overlay detail is open (desktop)", async () => {
    renderWithProviders(<AppShell />, { route: "/?place=1" });
    await screen.findByRole("button", { name: /edit place/i });
    expect(screen.queryByRole("button", { name: /add place/i })).not.toBeInTheDocument();
  });
});
