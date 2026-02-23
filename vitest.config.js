import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "./tests/env.js",
    isolate: false,
    hookTimeout: 20000
  },
  optimizeDeps: {
    disabled: true
  }
});
