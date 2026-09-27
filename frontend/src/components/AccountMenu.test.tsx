import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountMenu from "./AccountMenu";

describe("AccountMenu", () => {
  it("opens from the avatar and shows the user, Settings and Log out", async () => {
    const onLogout = vi.fn();
    const onOpenSettings = vi.fn();
    render(<AccountMenu username="amy" role="admin" onLogout={onLogout} onOpenSettings={onOpenSettings} updateAvailable={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Account (amy)" }));
    expect(screen.getByText("amy")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Account (amy)" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("names the open menu after the user and role", async () => {
    render(<AccountMenu username="amy" role="admin" onLogout={() => {}} onOpenSettings={() => {}} updateAvailable={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Account (amy)" }));
    expect(screen.getByRole("menu", { name: "Account: amy, Admin" })).toBeInTheDocument();
  });

  it("flags an available update on the avatar and the Settings item", async () => {
    render(<AccountMenu username="amy" role="member" onLogout={() => {}} onOpenSettings={() => {}} updateAvailable />);
    const trigger = screen.getByRole("button", { name: "Account (amy), update available" });
    expect(trigger.querySelector("[aria-label]")).toBeNull();
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toBeNull();
    await userEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: /settings · update available/i })).toBeInTheDocument();
  });
});
