/**
 * Vitest configuration for e2e tests. 120-second timeout for external service calls.
 *
 * @module @maw/agent/vitest.e2e.config
 */
import { defineConfig } from "vitest/config";
// Import env validation as a side-effect so required keys still fail fast.
import "./src/config.js";

export default defineConfig({
  test: {
    include: ["src/**/*.e2e.test.ts"],
    fileParallelism: true,
    maxWorkers: 3,
    environment: "node",
    testTimeout: 200000,
  },
});
