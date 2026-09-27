import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AddFab from "./AddFab";

describe("AddFab", () => {
  it("sits 36px from the bottom on desktop, clear of the map attribution", () => {
    render(<AddFab onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /add place/i }).style.bottom).toBe("36px");
  });
});
