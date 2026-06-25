import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import TagsSection from "./TagsSection";

describe("TagsSection", () => {
  it("lists tags with counts and renames one", async () => {
    let renamed: unknown = null;
    server.use(
      http.get("/api/tags", () => HttpResponse.json([{ tag: "food", count: 3 }, { tag: "eats", count: 1 }])),
      http.patch("/api/tags/rename", async ({ request }) => {
        renamed = await request.json();
        return HttpResponse.json([{ tag: "food", count: 4 }]);
      }),
    );
    renderWithProviders(<TagsSection />);
    expect(await screen.findByText("food")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /rename food/i }));
    const input = screen.getByLabelText(/new name for food/i);
    await userEvent.clear(input);
    await userEvent.type(input, "eats");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(renamed).toEqual({ old: "food", new: "eats" }));
  });
});
