import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";

export function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

export function renderWithProviders(ui: ReactElement, opts?: { client?: QueryClient }) {
  const client = opts?.client ?? makeClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), client };
}
