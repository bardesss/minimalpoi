import { expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { getMe, getSetupStatus, login, logout, setup } from "./auth";

test("getSetupStatus returns the flag", async () => {
  await expect(getSetupStatus()).resolves.toEqual({ needs_setup: false });
});

test("getMe returns the current user", async () => {
  const me = await getMe();
  expect(me.username).toBe("admin");
  expect(me.role).toBe("admin");
});

test("login returns the user on good password", async () => {
  const user = await login("ada", "good");
  expect(user.username).toBe("ada");
});

test("login throws ApiError(401) on bad password", async () => {
  await expect(login("ada", "bad")).rejects.toMatchObject({ status: 401 });
});

test("setup creates the admin and returns the user", async () => {
  const user = await setup("root", "pw");
  expect(user.username).toBe("root");
});

test("logout resolves", async () => {
  await expect(logout()).resolves.toBeUndefined();
});

test("getMe throws ApiError(401) when unauthenticated", async () => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
  );
  await expect(getMe()).rejects.toMatchObject({ status: 401 });
});
