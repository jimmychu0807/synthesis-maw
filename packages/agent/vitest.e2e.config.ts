/**
 * Vitest configuration for e2e tests. 120-second timeout for external service calls.
 *
 * @module @maw/agent/vitest.e2e.config
 */
import { defineConfig } from "vitest/config";
import { env } from "./src/config.js";

export default defineConfig({
  test: {
    include: ["src/**/*.e2e.test.ts"],
    exclude: [
      env.VENICE_E2E_TEST === "true" ? "" : "src/venice/__tests__/*.e2e.test.ts",
    ].filter(Boolean),
    environment: "node",
    testTimeout: 120000,
  },
});
