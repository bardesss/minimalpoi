import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw";

// jsdom does not implement URL.createObjectURL / revokeObjectURL; stub them so
// tests can spy on them.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
