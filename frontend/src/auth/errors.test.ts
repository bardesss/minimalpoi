import { describe, expect, it } from "vitest";
import { SessionNotPersistedError, sessionNotPersistedMessage } from "./errors";

describe("sessionNotPersistedMessage", () => {
  it("names HTTPS as the fix on a plain-HTTP origin, where a Secure cookie cannot survive", () => {
    const message = sessionNotPersistedMessage("http:");
    expect(message).toMatch(/https/i);
    expect(message).toMatch(/secure cookie/i);
  });

  it("does not blame HTTPS when the page is already served over it", () => {
    expect(sessionNotPersistedMessage("https:")).not.toMatch(/https:\/\//i);
  });

  it("explains the session was not kept, whatever the origin", () => {
    for (const protocol of ["http:", "https:"]) {
      expect(sessionNotPersistedMessage(protocol)).toMatch(/session/i);
    }
  });
});

describe("SessionNotPersistedError", () => {
  it("is identifiable by name after crossing an async boundary", () => {
    const err = new SessionNotPersistedError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SessionNotPersistedError");
  });
});
