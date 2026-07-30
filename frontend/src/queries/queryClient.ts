import { QueryClient } from "@tanstack/react-query";

// Shared app QueryClient config. A short staleTime stops React Query from
// refetching every list on each window focus / component remount, while still
// refreshing within the minute. Per-query overrides (e.g. useVersion's 1h
// staleTime) still win.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });
}
