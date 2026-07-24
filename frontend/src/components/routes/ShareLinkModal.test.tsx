import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import ShareLinkModal from "./ShareLinkModal";
import type { RouteDetail, ShareInfo } from "../../types/api";
import { renderWithProviders } from "../../test/utils";

const putShareSpy = vi.fn<(routeId: number, body: unknown) => Promise<ShareInfo>>();
const regenerateShareSpy = vi.fn<(routeId: number) => Promise<ShareInfo>>();
const deleteShareSpy = vi.fn<(routeId: number) => Promise<void>>();
vi.mock("../../api/share", () => ({
  putShare: (...a: unknown[]) => putShareSpy(...(a as [number, unknown])),
  regenerateShare: (...a: unknown[]) => regenerateShareSpy(...(a as [number])),
  deleteShare: (...a: unknown[]) => deleteShareSpy(...(a as [number])),
}));

const baseRoute = {
  id: 1, name: "Trip", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-16",
  node_count: 0, created_by: 1, owner_username: "admin", team_id: null, team_name: null, round_trip: false,
  can_edit: true, nodes: [], legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
} as unknown as RouteDetail;

const activeShare: ShareInfo = {
  token: "tok123", url: "http://other-host/s/tok123", expires_at: null, password_set: false,
};

function routeWithShare(share: ShareInfo | null): RouteDetail {
  return { ...baseRoute, share } as RouteDetail;
}

beforeEach(() => {
  putShareSpy.mockReset();
  regenerateShareSpy.mockReset();
  deleteShareSpy.mockReset();
  putShareSpy.mockResolvedValue(activeShare);
  regenerateShareSpy.mockResolvedValue({ ...activeShare, token: "tok456" });
  deleteShareSpy.mockResolvedValue(undefined);
});

describe("ShareLinkModal", () => {
  it("offers to create a public link when none exists", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(null)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /create public link/i }));
    await waitFor(() => expect(putShareSpy).toHaveBeenCalledWith(1, {}));
  });

  it("shows the public URL built from window.location.origin, not the raw share.url", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    const expected = `${window.location.origin}/s/tok123`;
    expect(await screen.findByDisplayValue(expected)).toBeInTheDocument();
  });

  it("sets a password and clears the field on success", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /^set$/i }));
    await waitFor(() => expect(putShareSpy).toHaveBeenCalledWith(1, { password: "secret123" }));
    await waitFor(() => expect(passwordInput.value).toBe(""));
  });

  it("keeps the typed password when Set fails", async () => {
    putShareSpy.mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /^set$/i }));
    await screen.findByRole("status");
    expect(passwordInput.value).toBe("secret123");
  });

  it("removes the password when Remove is clicked", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare({ ...activeShare, password_set: true })} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(putShareSpy).toHaveBeenCalledWith(1, { remove_password: true }));
  });

  it("sets an expiry preset", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /7 days/i }));
    await waitFor(() => expect(putShareSpy).toHaveBeenCalledWith(1, { expires_at: expect.any(String) }));
  });

  it("revokes the link", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await waitFor(() => expect(deleteShareSpy).toHaveBeenCalledWith(1));
  });

  it("regenerates the link", async () => {
    renderWithProviders(<ShareLinkModal route={routeWithShare(activeShare)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
    await waitFor(() => expect(regenerateShareSpy).toHaveBeenCalledWith(1));
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderWithProviders(<ShareLinkModal route={routeWithShare(null)} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
