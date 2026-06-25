import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BrandLogo from "./BrandLogo";

describe("BrandLogo", () => {
  it("renders a lucide map-pin icon", () => {
    const { container } = render(<BrandLogo />);
    expect(container.querySelector("svg.lucide-map-pin")).toBeInTheDocument();
  });
});
