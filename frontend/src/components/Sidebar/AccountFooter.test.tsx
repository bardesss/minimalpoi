// frontend/src/components/Sidebar/AccountFooter.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountFooter from "./AccountFooter";

describe("AccountFooter", () => {
  it("shows the username + role and logs out", async () => {
    const onLogout = vi.fn();
    render(<AccountFooter username="admin" role="admin" onLogout={onLogout} onOpenData={() => {}} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});

describe("AccountFooter data button", () => {
  it("calls onOpenData when the gear is clicked", async () => {
    const onOpenData = vi.fn();
    render(<AccountFooter username="admin" role="admin" onLogout={() => {}} onOpenData={onOpenData} />);
    await userEvent.click(screen.getByRole("button", { name: /data & backups/i }));
    expect(onOpenData).toHaveBeenCalledOnce();
  });
});
