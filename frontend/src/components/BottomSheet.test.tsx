import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BottomSheet from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders headerRight content in the handle row alongside the grip", () => {
    render(
      <BottomSheet label="Places" headerRight={<span>40 places</span>}>
        <div>CONTENT</div>
      </BottomSheet>,
    );
    expect(screen.getByText("40 places")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });

  it("renders no extra header content when headerRight is omitted", () => {
    render(
      <BottomSheet label="Places">
        <div>CONTENT</div>
      </BottomSheet>,
    );
    expect(screen.queryByText(/places/i)).not.toBeInTheDocument();
  });
});
