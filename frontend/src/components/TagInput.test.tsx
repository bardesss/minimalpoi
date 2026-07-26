import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagInput from "./TagInput";

const suggestions = [
  { tag: "coworking", count: 12 },
  { tag: "cowshed", count: 3 },
  { tag: "cafe", count: 20 },
];

function setup(value: string[] = []) {
  const onChange = vi.fn();
  render(<TagInput value={value} onChange={onChange} suggestions={suggestions} inputId="t" />);
  return { onChange, input: screen.getByPlaceholderText(/add a tag/i) };
}

describe("TagInput", () => {
  it("renders the current tags as chips", () => {
    setup(["cafe", "wifi"]);
    expect(screen.getByText("cafe")).toBeInTheDocument();
    expect(screen.getByText("wifi")).toBeInTheDocument();
  });

  it("filters suggestions by what's typed, excluding already-added tags", async () => {
    const { input } = setup(["cowshed"]);
    await userEvent.type(input, "cow");
    const list = within(screen.getByRole("listbox"));
    expect(list.getByText("coworking")).toBeInTheDocument();
    expect(list.queryByText("cowshed")).not.toBeInTheDocument(); // already added (only a chip)
    expect(list.queryByText("cafe")).not.toBeInTheDocument(); // doesn't match "cow"
  });

  it("adds a suggestion (canonical casing) when clicked", async () => {
    const { onChange, input } = setup(["cafe"]);
    await userEvent.type(input, "cow");
    await userEvent.click(screen.getByText("coworking"));
    expect(onChange).toHaveBeenCalledWith(["cafe", "coworking"]);
  });

  it("adds the typed text as a new tag on Enter", async () => {
    const { onChange, input } = setup();
    await userEvent.type(input, "brunch{Enter}");
    expect(onChange).toHaveBeenCalledWith(["brunch"]);
  });

  it("commits the current token when a comma is typed", async () => {
    const { onChange, input } = setup();
    await userEvent.type(input, "brunch,");
    expect(onChange).toHaveBeenCalledWith(["brunch"]);
  });

  it("does not add a duplicate tag (case-insensitive)", async () => {
    const { onChange, input } = setup(["Cafe"]);
    await userEvent.type(input, "cafe{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a tag when its remove button is clicked", async () => {
    const { onChange } = setup(["cafe", "wifi"]);
    await userEvent.click(screen.getByRole("button", { name: /remove cafe/i }));
    expect(onChange).toHaveBeenCalledWith(["wifi"]);
  });

  it("removes the last tag on Backspace when the field is empty", async () => {
    const { onChange, input } = setup(["cafe", "wifi"]);
    input.focus();
    await userEvent.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith(["cafe"]);
  });

  it("commits pending typed text on blur", async () => {
    const { onChange, input } = setup();
    await userEvent.type(input, "brunch");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(["brunch"]);
  });

  it("adds the highlighted suggestion via arrow keys + Enter", async () => {
    const { onChange, input } = setup();
    await userEvent.type(input, "cow");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}"); // 1st down -> coworking, 2nd -> cowshed
    expect(onChange).toHaveBeenCalledWith(["cowshed"]);
  });
});
