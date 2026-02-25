import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "./tests/env.js",
    isolate: false,
    hookTimeout: 20000,

    environmentMatchGlobs: [
      ["**/ui/**/*.test.js", "jsdom"],
      ["**/dom/**/*.test.js", "jsdom"]
    ],

    setupFiles: ["./tests/setup.js"]
  },

  optimizeDeps: {
    disabled: true
  },
  environmentMatchGlobs: [
    ["tests/ui/**/*.test.js", "jsdom"],
    ["tests/dom/**/*.test.js", "jsdom"]
  ]
});
