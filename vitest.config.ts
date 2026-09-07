import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /* The vector table is data, not a spec, and must never be collected. */
    exclude: ["tests/**/*.vectors.ts", "node_modules/**"],
  },
});
