import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";

const MAX_ATTEMPTS = 3;

// A 4xx is the server's settled answer, not a hiccup: retrying it just
// multiplies the failure. A dead session used to cost six endpoints times three
// attempts before anything was shown to the user.
function retry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_ATTEMPTS;
}

// Shared app QueryClient config. A short staleTime stops React Query from
// refetching every list on each window focus / component remount, while still
// refreshing within the minute. Per-query overrides (e.g. useVersion's 1h
// staleTime) still win.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry } },
  });
}
