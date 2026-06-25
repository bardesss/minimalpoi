import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/utils";
import SettingsModal from "./SettingsModal";

describe("SettingsModal", () => {
  it("renders the Data & backups section and a close button", async () => {
    renderWithProviders(<SettingsModal onClose={() => {}} />);
    const dataBtn = await screen.findByRole("button", { name: "Data & backups" });
    expect(dataBtn).toBeInTheDocument();
    await userEvent.click(dataBtn);
    expect(screen.getByText(/Import places/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});
