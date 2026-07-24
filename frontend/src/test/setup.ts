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

// jsdom does not implement Element.prototype.scrollIntoView; stub it so
// components that scroll a selected item into view (e.g. the sidebar POI list
// on marker select) don't throw. Individual tests can still spy by reassigning.
if (typeof window !== "undefined" && typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom does not implement matchMedia; stub it so useMediaQuery resolves to the
// desktop layout (matches: false) in tests. Guard on `window` first: node-env
// test files (e.g. api/portability.test.ts) have no `window` at all.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
