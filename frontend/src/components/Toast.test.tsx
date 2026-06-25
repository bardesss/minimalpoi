import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify("Saved ✓")}>
      fire
    </button>
  );
}

describe("Toast", () => {
  it("shows a toast message when notify is called", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "fire" }));
    expect(await screen.findByText("Saved ✓")).toBeInTheDocument();
  });
});
