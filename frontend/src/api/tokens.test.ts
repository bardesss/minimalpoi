import { expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { createToken, getTokens, revokeToken } from "./tokens";

test("getTokens lists the caller's tokens", async () => {
  server.use(http.get("/api/tokens", () =>
    HttpResponse.json([{ id: 1, name: "cli", prefix: "ab12cd34",
                         created_at: "2026-07-26T00:00:00Z", last_used_at: null }])));
  await expect(getTokens()).resolves.toHaveLength(1);
});

test("createToken returns the plaintext once", async () => {
  server.use(http.post("/api/tokens", () =>
    HttpResponse.json({ id: 2, name: "cli", prefix: "ab12cd34",
                        token: "mpoi_ab12cd34_secret",
                        created_at: "2026-07-26T00:00:00Z", last_used_at: null }, { status: 201 })));
  await expect(createToken("cli")).resolves.toMatchObject({ token: "mpoi_ab12cd34_secret" });
});

test("revokeToken resolves on 204", async () => {
  server.use(http.delete("/api/tokens/2", () => new HttpResponse(null, { status: 204 })));
  await expect(revokeToken(2)).resolves.toBeUndefined();
});
