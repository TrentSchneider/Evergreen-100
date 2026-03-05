import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadStore, initDb } from "../../src/state/storage.js";

describe("storage module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loadStore returns progress store functions", async () => {
    const store = await loadStore();
    
    // Verify that the store has the expected functions
    expect(store).toBeDefined();
    expect(typeof store.getAllValues).toBe("function");
    expect(typeof store.saveValue).toBe("function");
    expect(typeof store.loadSettings).toBe("function");
    expect(typeof store.saveSettings).toBe("function");
    expect(typeof store.snapshotDay).toBe("function");
    expect(typeof store.loadHistory).toBe("function");
  });

  it("initDb initializes the database", async () => {
    // This should complete without throwing
    await expect(initDb()).resolves.toBeUndefined();
  });

  it("loadStore can be called multiple times", async () => {
    const store1 = await loadStore();
    const store2 = await loadStore();
    
    // Both should return valid store objects
    expect(store1).toBeDefined();
    expect(store2).toBeDefined();
    expect(typeof store1.getAllValues).toBe("function");
    expect(typeof store2.getAllValues).toBe("function");
  });
});
