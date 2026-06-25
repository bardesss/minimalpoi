import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { renderWithProviders } from "../test/utils";
import DataModal from "./DataModal";

describe("DataModal", () => {
  it("imports a file and shows the summary", async () => {
    server.use(
      http.post("/api/pois/import", () =>
        HttpResponse.json({ created: 3, skipped: 1, errors: [{ row: 2, reason: "missing name" }], created_ids: [1, 2, 3] }),
      ),
    );
    renderWithProviders(<DataModal onClose={() => {}} />);
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
    renderWithProviders(<DataModal onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /export geojson/i }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createUrl).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
