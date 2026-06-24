// NOTE: the shared MSW `server` lifecycle (listen/resetHandlers/close) is
// already managed globally by src/test/setup.ts — do NOT redeclare it here
// (doing so caused noisy/duplicate-listen output). This test relies on the
// default login handler in test/msw.ts (password !== "good" → 401).
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/utils";
import LoginPage from "./LoginPage";

describe("LoginPage", () => {
  it("shows an error on bad credentials", async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i);
  });
});
