import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import AppLoading from "./AppLoading";

test("exposes an accessible loading status with the brand wordmark", () => {
  render(<AppLoading />);
  const status = screen.getByRole("status", { name: "Loading" });
  expect(status).toBeInTheDocument();
  expect(screen.getByText("MinimalPOI")).toBeInTheDocument();
});
