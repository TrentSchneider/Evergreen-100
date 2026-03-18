// tests/env.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default {
  name: "fake-indexeddb-env",
  transformMode: "ssr",

  async setup() {
    // Load fake-indexeddb BEFORE any test files import DB modules
    require("fake-indexeddb/auto");

    return {
      teardown() {
        // nothing needed
      }
    };
  }
};
