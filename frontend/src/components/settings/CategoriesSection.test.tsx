import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw";
import { renderWithProviders } from "../../test/utils";
import CategoriesSection from "./CategoriesSection";

describe("CategoriesSection", () => {
  it("lists categories and creates a new one", async () => {
    let created: unknown = null;
    server.use(
      http.post("/api/categories", async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ id: 9, name: "Bars", color: "#4f46e5", icon: "beer", created_by: 1, trip_category_id: null, trip_sync_status: "local_only" }, { status: 201 });
      }),
    );
    renderWithProviders(<CategoriesSection />);
    expect(await screen.findByText("Restaurants")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add category/i }));
    await userEvent.type(screen.getByLabelText(/category name/i), "Bars");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(created).toMatchObject({ name: "Bars" }));
  });
});
