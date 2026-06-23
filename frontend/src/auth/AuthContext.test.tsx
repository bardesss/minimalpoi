import { expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/msw";
import { AuthProvider, useAuth } from "./AuthContext";

function Probe() {
  const { user, loading, signIn, signOut } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>user: {user ? user.username : "none"}</p>
      <button onClick={() => signIn("ada", "good")}>sign in</button>
      <button onClick={() => signOut()}>sign out</button>
    </div>
  );
}

test("bootstraps the authed user from /me", async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(screen.getByText("loading")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("user: admin")).toBeInTheDocument());
});

test("treats a 401 from /me as logged out", async () => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
});

test("signIn then signOut updates the user", async () => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "sign in" }));
  await waitFor(() => expect(screen.getByText("user: ada")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "sign out" }));
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
});
