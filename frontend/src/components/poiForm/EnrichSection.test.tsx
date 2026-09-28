import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnrichSection } from "./EnrichSection";

describe("EnrichSection", () => {
  it("gives the url field a url keyboard", () => {
    render(<EnrichSection onEnrich={vi.fn()} onApplyDraft={vi.fn()} filledCount={0} enrichHost={null} />);
    const input = screen.getByLabelText(/enrich from url/i);
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute("inputmode", "url");
  });
});
