import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthCard, AuthField } from "./AuthCard";

describe("AuthCard", () => {
  it("renders heading, fields, submit, and a role=alert error", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    const onChange = vi.fn();
    render(
      <AuthCard ariaLabel="Log in" heading="MinimalPOI" onSubmit={onSubmit} submitLabel="Log in" error="Bad creds">
        <AuthField id="u" label="Username" value="" onChange={onChange} />
      </AuthCard>,
    );
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Bad creds");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("AuthField reports typed values and honours disabled", () => {
    const onChange = vi.fn();
    render(<AuthField id="p" label="Password" type="password" value="" onChange={onChange} disabled />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.type).toBe("password");
  });
});
