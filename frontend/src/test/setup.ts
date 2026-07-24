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

// jsdom never performs real layout, so every element's offsetWidth/offsetHeight
// is 0. @tanstack/react-virtual (used by the POI sidebar list) reads these to
// size its scroll container; a 0-height container makes it compute an empty
// visible range (renders nothing), which would break any test that expects to
// find a POI card. Stub non-zero values so the virtualizer always has a
// deterministic, non-empty window to work with. Nothing else in the app reads
// these properties, so this is safe to apply globally.
if (typeof window !== "undefined") {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 400 });
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
