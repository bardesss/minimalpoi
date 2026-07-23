// A per-tab identity used to suppress self-echo over the route live-sync stream:
// mutations send it as X-Route-Client, the server echoes it, and this tab ignores
// events carrying its own id. New tab = new id, which is what we want.
//
// Guard crypto.randomUUID: it runs at module load, and the jsdom test env's
// `crypto` does not guarantee randomUUID — a hard call here would crash every
// test that imports this module (and any old browser).
function makeClientId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "cid-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const clientId: string = makeClientId();

export function routeClientHeaders(): Record<string, string> {
  return { "X-Route-Client": clientId };
}
