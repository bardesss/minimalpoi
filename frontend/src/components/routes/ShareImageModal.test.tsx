import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareImageModal from "./ShareImageModal";
import type { MapSettings, RouteDetail } from "../../types/api";

const fakeBlob = new Blob(["x"], { type: "image/png" });
const renderSpy = vi.fn(async (..._args: unknown[]) => fakeBlob);
const downloadSpy = vi.fn();
vi.mock("../../lib/share/shareRender", () => ({ renderShareImage: (...a: unknown[]) => renderSpy(...a) }));
vi.mock("../../lib/download", () => ({ triggerDownload: (...a: unknown[]) => downloadSpy(...a) }));

const pdfBlob = new Blob(["%PDF-"], { type: "application/pdf" });
const pdfSpy = vi.fn(async (..._a: unknown[]) => pdfBlob);
vi.mock("../../lib/share/sharePdf", () => ({ renderSharePdf: (...a: unknown[]) => pdfSpy(...a) }));

const route = { id: 1, name: "Trip", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-16",
  total_distance_m: 1000, total_duration_s: 0, nodes: [{ id: 1, role: null }], legs: [] } as unknown as RouteDetail;
const settings = { default_map_center_lat: 0, default_map_center_lng: 0, default_map_zoom: 5 } as unknown as MapSettings;

beforeEach(() => { renderSpy.mockClear(); downloadSpy.mockClear(); pdfSpy.mockClear(); (URL as any).createObjectURL = vi.fn(() => "blob:x"); (URL as any).revokeObjectURL = vi.fn(); });

describe("ShareImageModal", () => {
  it("renders a preview and offers all formats + both variants", async () => {
    render(<ShareImageModal route={route} settings={settings} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /square/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /story/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /landscape/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /transparent/i })).toBeInTheDocument();
    await waitFor(() => expect(renderSpy).toHaveBeenCalled());
  });

  it("downloads the current blob", async () => {
    render(<ShareImageModal route={route} settings={settings} onClose={vi.fn()} />);
    // Wait for the render to COMPLETE (Download re-enables), not just for the
    // render fn to be called — the blob is set after the async render resolves.
    await waitFor(() => expect(screen.getByRole("button", { name: /download/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /download/i }));
    expect(downloadSpy).toHaveBeenCalledWith(fakeBlob, "Trip - square - map.png");
  });

  it("disables download and shows an error when rendering fails", async () => {
    render(<ShareImageModal route={route} settings={settings} onClose={vi.fn()} />);
    // Wait for the render to COMPLETE so Download is enabled — waiting only for
    // renderSpy to be *called* samples the button while the async render is
    // still pending, which flakes under CI's serial (--no-file-parallelism) run.
    await waitFor(() => expect(screen.getByRole("button", { name: /download/i })).not.toBeDisabled());

    renderSpy.mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(screen.getByRole("button", { name: /landscape/i }));
    expect(await screen.findByText(/couldn't render the image/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeDisabled();
  });

  it("offers a PDF mode and downloads a generated PDF", async () => {
    render(<ShareImageModal route={route} settings={settings} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /download/i })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: /^pdf$/i }));
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(pdfSpy).toHaveBeenCalled());
    await waitFor(() => expect(downloadSpy).toHaveBeenCalledWith(pdfBlob, "Trip - itinerary.pdf"));
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<ShareImageModal route={route} settings={settings} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
