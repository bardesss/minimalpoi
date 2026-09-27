import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBox from "./SearchBox";

describe("SearchBox", () => {
  it("renders with default padding when compact is not set", () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    const wrapper = input.parentElement?.parentElement?.parentElement;
    const styleStr = wrapper?.getAttribute("style") || "";
    expect(styleStr).toContain("14px 20px 4px");
  });

  it("renders with compact padding when compact is true", () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} compact />);
    const input = screen.getByRole("textbox");
    const wrapper = input.parentElement?.parentElement?.parentElement;
    const styleStr = wrapper?.getAttribute("style") || "";
    expect(styleStr).toContain("8px 20px 4px");
  });

  it("renders with default padding when compact is false", () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} compact={false} />);
    const input = screen.getByRole("textbox");
    const wrapper = input.parentElement?.parentElement?.parentElement;
    const styleStr = wrapper?.getAttribute("style") || "";
    expect(styleStr).toContain("14px 20px 4px");
  });

  it("updates the value on input change", async () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "te");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, "t");
    expect(onChange).toHaveBeenNthCalledWith(2, "e");
  });

  it("renders trailing content when provided", () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} trailing={<button>Filter</button>} />);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });
});
