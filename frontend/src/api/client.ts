export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Register the callback fired when an authenticated request comes back 401.
 * AuthContext uses it to drop the signed-in user, so a session that died
 * server-side (expired cookie, bumped token_version, a cookie the browser
 * refused to store) lands on the login page instead of leaving every query
 * retrying against a session that no longer exists. Pass null to clear. */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

// Paths where a 401 is an ordinary answer rather than a dead session: the auth
// endpoints (a wrong password, or the bootstrap probe while signed out) and the
// public share links, whose visitors have no session to end.
const SESSION_EXEMPT_PREFIXES = ["/api/auth/", "/api/public/"];

function notifyIfSessionLost(path: string, status: number): void {
  if (status !== 401) return;
  if (SESSION_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return;
  unauthorizedHandler?.();
}

async function toApiError(path: string, res: Response): Promise<ApiError> {
  let detail = res.statusText;
  try {
    const data = await res.json();
    if (data && typeof data.detail === "string") detail = data.detail;
  } catch {
    // non-JSON error body; keep statusText
  }
  notifyIfSessionLost(path, res.status);
  return new ApiError(res.status, detail);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (!res.ok) throw await toApiError(path, res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Downloads (backup, exports) can't go through apiFetch — they want the raw body,
// not parsed JSON — but they should still share its credential handling and its
// `detail`-extracting error path instead of surfacing a bare statusText.
export async function fetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const res = await fetch(path, { ...init, headers: new Headers(init.headers), credentials: "include" });
  if (!res.ok) throw await toApiError(path, res);
  return res.blob();
}
