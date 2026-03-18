import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb } from "../../helpers/resetDb.js";
import { openDb, __resetDbInstance } from "../../../src/db/openDb.js";

describe("openDb.concurrency", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetDbInstance();
  });

  it("returns the same instance for concurrent callers", async () => {
    const [dbA, dbB, dbC] = await Promise.all([openDb(), openDb(), openDb()]);

    expect(dbA).toBe(dbB);
    expect(dbB).toBe(dbC);
  });

  it("reuses the cached connection after the first open", async () => {
    const openSpy = vi.spyOn(indexedDB, "open");

    await openDb();
    await openDb();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
