import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy API + images to FastAPI so the httpOnly auth cookie is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7676,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/images": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  build: { outDir: "dist" },
});
