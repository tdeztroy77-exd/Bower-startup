import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Vitest configuration.
 *
 * `@/` resolves from the project root so tests can import application
 * modules the same way the app does. Without this, any route or helper that
 * uses the alias fails to load before a single assertion runs.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
})
