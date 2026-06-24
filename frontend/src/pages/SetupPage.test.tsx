// frontend/src/pages/SetupPage.test.tsx
// NOTE: shared MSW server lifecycle is managed globally by src/test/setup.ts —
// do NOT redeclare beforeAll/afterEach/afterAll here.
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/utils";
import SetupPage from "./SetupPage";

describe("SetupPage", () => {
  it("renders the create-admin form with labeled fields", () => {
    renderWithProviders(<SetupPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create|set up|continue/i })).toBeInTheDocument();
  });
});
