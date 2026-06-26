import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhoneInput from "./PhoneInput";

describe("PhoneInput", () => {
  it("emits E.164 for a valid number on blur (default country NL)", async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} id="p" />);
    const input = screen.getByPlaceholderText("20 308 0090");
    await userEvent.type(input, "203080090");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("+31203080090");
  });

  it("parses an existing E.164 value into country + national", () => {
    render(<PhoneInput value="+12127363100" onChange={() => {}} />);
    expect((screen.getByLabelText("Country") as HTMLSelectElement).value).toBe("US");
    expect((screen.getByPlaceholderText("20 308 0090") as HTMLInputElement).value).toBe("2127363100");
  });

  it("switching country re-normalizes the same digits", async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText("20 308 0090");
    await userEvent.type(input, "2127363100");
    fireEvent.blur(input);
    onChange.mockClear();
    await userEvent.selectOptions(screen.getByLabelText("Country"), "US");
    expect(onChange).toHaveBeenCalledWith("+12127363100");
  });

  it("clearing the field emits an empty string", async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="+31203080090" onChange={onChange} />);
    const input = screen.getByPlaceholderText("20 308 0090");
    await userEvent.clear(input);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
