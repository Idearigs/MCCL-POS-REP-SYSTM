/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";

// Single source of truth for the app version — read from package.json so the
// UI (e.g. the sidebar footer) always shows the real build version. Bump the
// "version" field in package.json to change it.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

// https://vitejs.dev/config/
// NOTE: VitePWA / service worker has been intentionally removed.
// The service worker was caching old login page builds and serving them
// after logout, even after new deployments. A POS system always runs
// online so offline caching provides no benefit and only causes issues.
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['backend/**', 'node_modules/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
