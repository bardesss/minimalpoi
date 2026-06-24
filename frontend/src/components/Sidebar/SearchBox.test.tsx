import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBox from "./SearchBox";

describe("SearchBox", () => {
  it("emits each change", async () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/search places/i), "caf");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
