// frontend/src/components/Sidebar/AccountFooter.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountFooter from "./AccountFooter";

describe("AccountFooter", () => {
  it("shows the username + role and logs out", async () => {
    const onLogout = vi.fn();
    render(<AccountFooter username="admin" role="admin" onLogout={onLogout} onOpenSettings={() => {}} updateAvailable={false} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});

describe("AccountFooter settings button", () => {
  it("calls onOpenSettings when the gear is clicked", async () => {
    const onOpenSettings = vi.fn();
    render(<AccountFooter username="admin" role="admin" onLogout={() => {}} onOpenSettings={onOpenSettings} updateAvailable={false} />);
    await userEvent.click(screen.getByRole("button", { name: /settings/i }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("shows an update dot when an update is available", () => {
    render(<AccountFooter username="admin" role="admin" onLogout={() => {}} onOpenSettings={() => {}} updateAvailable />);
    expect(screen.getByLabelText(/update available/i)).toBeInTheDocument();
  });
});
