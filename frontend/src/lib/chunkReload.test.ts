import { afterEach, describe, expect, it, vi } from "vitest";
import { installChunkReload, reloadForStaleChunk, RELOAD_GUARD_MS } from "./chunkReload";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

function preloadError(): Event {
  return new Event("vite:preloadError", { cancelable: true });
}

describe("reloadForStaleChunk", () => {
  it("reloads the page and suppresses the error on a first failed chunk load", () => {
    const reload = vi.fn();
    const event = preloadError();
    const handled = reloadForStaleChunk(event, { storage: memoryStorage(), reload, now: () => 1_000 });
    expect(handled).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not reload again within the guard window (no reload loop)", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadForStaleChunk(preloadError(), { storage, reload, now: () => 1_000 });

    const second = preloadError();
    const handled = reloadForStaleChunk(second, { storage, reload, now: () => 1_000 + RELOAD_GUARD_MS - 1 });
    expect(handled).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    // The error is let through so the app's error handling still sees it.
    expect(second.defaultPrevented).toBe(false);
  });

  it("reloads again once the guard window has passed", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadForStaleChunk(preloadError(), { storage, reload, now: () => 1_000 });
    const handled = reloadForStaleChunk(preloadError(), { storage, reload, now: () => 1_000 + RELOAD_GUARD_MS + 1 });
    expect(handled).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when sessionStorage is unavailable (the loop guard can't be kept)", () => {
    const reload = vi.fn();
    const throwing = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("SecurityError"); },
    };
    const event = preloadError();
    expect(() => reloadForStaleChunk(event, { storage: throwing, reload, now: () => 1_000 })).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("installChunkReload", () => {
  afterEach(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("listens for vite:preloadError on the window and reloads once", () => {
    const reload = vi.fn();
    const uninstall = installChunkReload(window, reload);
    try {
      const event = preloadError();
      window.dispatchEvent(event);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
      window.dispatchEvent(preloadError());
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      uninstall();
    }
  });
});
