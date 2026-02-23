import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "../helpers/resetDb.js";
import * as openDbModule from "../../src/db/openDb.js";
import { DB_NAME, DB_VERSION } from "../../src/db/schema.js";

const { openDb, __closeDbInstance, __resetDbInstance } = openDbModule;

describe("openDb", () => {
  beforeEach(resetDb);

  it("opens the database", async () => {
    const db = await openDb();
    expect(db.name).toBe(DB_NAME);
  });

  it("opens at the correct version", async () => {
    const db = await openDb();
    expect(db.version).toBe(DB_VERSION);
  });
});
