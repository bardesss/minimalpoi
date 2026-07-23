import { describe, expect, it } from "vitest";
import { clientId, routeClientHeaders } from "./clientId";

describe("clientId", () => {
  it("is a stable non-empty string", () => {
    expect(typeof clientId).toBe("string");
    expect(clientId.length).toBeGreaterThan(0);
    expect(clientId).toBe(clientId); // stable within the module
  });

  it("routeClientHeaders carries the id under X-Route-Client", () => {
    expect(routeClientHeaders()).toEqual({ "X-Route-Client": clientId });
  });
});
