import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import DataSection from "./DataSection";

afterEach(() => vi.restoreAllMocks());

describe("DataSection", () => {
  it("imports a file and shows the summary", async () => {
    server.use(
      http.post("/api/pois/import", () =>
        HttpResponse.json({ created: 3, skipped: 1, errors: [{ row: 2, reason: "missing name" }], created_ids: [1, 2, 3] }),
      ),
    );
    renderWithProviders(<DataSection />);
    const file = new File(["name,lat,lng\nA,1,2\n"], "places.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText(/choose file/i), file);
    await waitFor(() => expect(screen.getByText(/3 added/i)).toBeInTheDocument());
    expect(screen.getByText(/1 skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/row 2: missing name/i)).toBeInTheDocument();
  });

  it("exports and triggers a download", async () => {
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    server.use(
      http.get("/api/pois/export", () =>
        HttpResponse.text('{"type":"FeatureCollection","features":[]}', {
          headers: { "Content-Type": "application/geo+json" },
        }),
      ),
    );
    renderWithProviders(<DataSection />);
    await userEvent.click(screen.getByRole("button", { name: /export geojson/i }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createUrl).toHaveBeenCalledOnce();
  });

  it("downloads a full backup (admin)", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    server.use(
      http.get("/api/backup", () =>
        HttpResponse.arrayBuffer(new Uint8Array([0x50, 0x4b]).buffer, { headers: { "Content-Type": "application/zip" } }),
      ),
    );
    renderWithProviders(<DataSection />);
    await userEvent.click(await screen.findByRole("button", { name: /download backup/i }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
  });

  it("restores a backup after a typed confirmation", async () => {
    let posted = false;
    server.use(http.post("/api/restore", () => { posted = true; return HttpResponse.json({ restored: { pois: 2, categories: 1 } }); }));
    renderWithProviders(<DataSection />);
    await userEvent.upload(await screen.findByLabelText(/choose backup file/i), new File(["x"], "b.zip", { type: "application/zip" }));
    const restoreBtn = screen.getByRole("button", { name: /^restore now$/i });
    expect(restoreBtn).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type restore to confirm/i), "RESTORE");
    expect(restoreBtn).toBeEnabled();
    await userEvent.click(restoreBtn);
    await waitFor(() => expect(posted).toBe(true));
    expect(await screen.findByText(/restored/i)).toBeInTheDocument();
  });

  it("shows an inline message when the database is not empty (409)", async () => {
    server.use(
      http.post("/api/restore", () => HttpResponse.json({ detail: "Database is not empty — restore is only allowed into a fresh instance." }, { status: 409 })),
    );
    renderWithProviders(<DataSection />);
    await userEvent.upload(await screen.findByLabelText(/choose backup file/i), new File(["x"], "b.zip", { type: "application/zip" }));
    await userEvent.type(screen.getByLabelText(/type restore to confirm/i), "RESTORE");
    await userEvent.click(screen.getByRole("button", { name: /^restore now$/i }));
    expect(await screen.findByText(/not empty/i)).toBeInTheDocument();
  });
});
