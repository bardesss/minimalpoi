// Recover from stale lazy chunks after a deploy. A tab (or installed
// standalone window) opened before the deploy still references the old hashed
// chunk names; the first lazy import after the deploy 404s, Vite fires
// `vite:preloadError`, and without handling React.lazy throws → blank app.
// Reloading picks up the new index.html (served no-cache) and its new hashes.
//
// A sessionStorage timestamp stops a reload loop when the chunk is genuinely
// broken (not merely stale): within RELOAD_GUARD_MS of the last reload the
// error is let through instead.

const KEY = "minimalpoi.chunkReloadAt";
export const RELOAD_GUARD_MS = 10_000;

type Deps = {
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: () => number;
};

/** Handle one `vite:preloadError`. Returns true when it reloaded the page. */
export function reloadForStaleChunk(event: Event, { storage, reload, now }: Deps): boolean {
  const at = now();
  try {
    const last = Number(storage.getItem(KEY));
    if (last && at - last >= 0 && at - last < RELOAD_GUARD_MS) return false;
    storage.setItem(KEY, String(at));
  } catch {
    // No sessionStorage (private mode / storage disabled): without the guard a
    // reload could loop forever, so leave the error to the app instead.
    return false;
  }
  event.preventDefault();
  reload();
  return true;
}

/** Register the handler on `win`; returns an uninstall function. */
export function installChunkReload(win: Window, reload: () => void = () => win.location.reload()): () => void {
  const onPreloadError = (event: Event) => {
    let storage: Storage;
    try {
      storage = win.sessionStorage;
    } catch {
      return; // accessing sessionStorage itself can throw (blocked site data)
    }
    reloadForStaleChunk(event, { storage, reload, now: Date.now });
  };
  win.addEventListener("vite:preloadError", onPreloadError);
  return () => win.removeEventListener("vite:preloadError", onPreloadError);
}
