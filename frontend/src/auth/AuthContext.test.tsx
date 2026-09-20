import { expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../test/msw";
import { apiFetch } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";
import { SessionNotPersistedError } from "./errors";

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
  let signedIn = false;
  server.use(
    http.get("/api/auth/me", () =>
      signedIn
        ? HttpResponse.json({ id: 1, username: "ada", role: "admin" })
        : HttpResponse.json({ detail: "Not authenticated" }, { status: 401 }),
    ),
    http.post("/api/auth/login", () => {
      signedIn = true;
      return HttpResponse.json({ id: 1, username: "ada", role: "admin" });
    }),
    http.post("/api/auth/logout", () => {
      signedIn = false;
      return HttpResponse.json({ status: "ok" });
    }),
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

function DataProbe() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>user: {user ? user.username : "none"}</p>
      <button onClick={() => void apiFetch("/api/pois").catch(() => {})}>load places</button>
    </div>
  );
}

test("a 401 from a data endpoint ends the session rather than leaving a signed-in shell", async () => {
  server.use(
    http.get("/api/pois", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  render(
    <AuthProvider>
      <DataProbe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("user: admin")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "load places" }));
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
});

function SignInProbe({ onError }: { onError: (err: unknown) => void }) {
  const { user, loading, signIn } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>user: {user ? user.username : "none"}</p>
      <button onClick={() => void signIn("ada", "good").catch(onError)}>sign in</button>
    </div>
  );
}

test("signIn refuses to report success when the browser dropped the session cookie", async () => {
  // Login succeeds but the cookie never sticks, so /me stays unauthenticated —
  // what a Secure cookie on a plain-HTTP origin does.
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  const onError = vi.fn();
  render(
    <AuthProvider>
      <SignInProbe onError={onError} />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "sign in" }));
  await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(SessionNotPersistedError)));
  await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
});
