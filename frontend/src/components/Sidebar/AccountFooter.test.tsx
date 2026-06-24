// frontend/src/components/Sidebar/AccountFooter.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountFooter from "./AccountFooter";

describe("AccountFooter", () => {
  it("shows the username + role and logs out", async () => {
    const onLogout = vi.fn();
    render(<AccountFooter username="admin" role="admin" onLogout={onLogout} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
