import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils";
import { server } from "../../test/msw";
import ApiTokensSection from "./ApiTokensSection";

describe("ApiTokensSection", () => {
  it("creates a token and reveals it once", async () => {
    server.use(
      http.get("/api/tokens", () => HttpResponse.json([])),
      http.post("/api/tokens", () => HttpResponse.json(
        { id: 1, name: "Claude", prefix: "ab12cd34", token: "mpoi_ab12cd34_secret",
          created_at: "2026-07-26T00:00:00Z", last_used_at: null }, { status: 201 })),
    );
    renderWithProviders(<ApiTokensSection />);
    await userEvent.type(await screen.findByLabelText(/token name/i), "Claude");
    await userEvent.click(screen.getByRole("button", { name: /create token/i }));
    await waitFor(() =>
      expect(screen.getByText(/mpoi_ab12cd34_secret/)).toBeInTheDocument());
  });

  it("lists existing tokens and revokes one", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let revoked = false;
    server.use(
      http.get("/api/tokens", () => HttpResponse.json([
        { id: 5, name: "cli", prefix: "ab12cd34", created_at: "2026-07-26T00:00:00Z", last_used_at: null },
      ])),
      http.delete("/api/tokens/5", () => {
        revoked = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<ApiTokensSection />);
    expect(await screen.findByText("cli")).toBeInTheDocument();
    expect(screen.getByText(/ab12cd34/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /revoke cli/i }));
    await waitFor(() => expect(revoked).toBe(true));
  });
});
