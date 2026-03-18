import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "../helpers/resetDb.js";
import * as openDbModule from "../../src/db/openDb.js";
import { DB_NAME, STORE_PROGRESS, STORE_DAILY_LOGS } from "../../src/db/schema.js";

const { openDb, __closeDbInstance, __resetDbInstance } = openDbModule;

describe("schema migrations", () => {
  beforeEach(resetDb);

  it("creates progress and daily_logs stores", async () => {
    const db = await openDb();
    expect(db.objectStoreNames.contains(STORE_PROGRESS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_DAILY_LOGS)).toBe(true);
  });

  it("creates lastCompletedDate index", async () => {
    const db = await openDb();
    const tx = db.transaction(STORE_PROGRESS, "readonly");
    const store = tx.objectStore(STORE_PROGRESS);
    expect(store.indexNames.contains("byLastCompletedDate")).toBe(true);
  });
});
