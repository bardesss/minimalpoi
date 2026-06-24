import { expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { server } from "./test/msw";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

function renderApp(initialPath = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("shows the app shell for an authenticated user", async () => {
  renderApp("/");
  expect(await screen.findByText("Café Modern")).toBeInTheDocument();
});

test("redirects to setup on first run", async () => {
  server.use(
    http.get("/api/auth/setup-status", () => HttpResponse.json({ needs_setup: true })),
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  renderApp("/");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Create the admin account" })).toBeInTheDocument(),
  );
});

test("unauthenticated user lands on login", async () => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  renderApp("/");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "MinimalPOI" })).toBeInTheDocument(),
  );
});

test("logging in with a bad password shows an error", async () => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  renderApp("/login");
  await userEvent.type(screen.getByLabelText("Username"), "ada");
  await userEvent.type(screen.getByLabelText("Password"), "bad");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials"));
});
