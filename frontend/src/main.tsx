import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl 6 resolves its worker at runtime via `new URL(<variable>,
// import.meta.url)`, which bundlers can't analyse statically — so the chunk is
// never emitted and the worker 404s against our own /assets/ (blank map, no
// tile requests). `?worker&url` makes Vite emit the worker *and* the
// maplibre-gl-shared.mjs chunk it imports, and hands back the hashed URL.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { setWorkerUrl } from "maplibre-gl";
import "./index.css";

setWorkerUrl(maplibreWorkerUrl);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import { makeQueryClient } from "./queries/queryClient";

const queryClient = makeQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
