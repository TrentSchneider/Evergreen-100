import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb } from "../../helpers/resetDb.js";
import { openDb, __resetDbInstance } from "../../../src/db/openDb.js";
import * as schemaModule from "../../../src/db/schema.js";

const schemaOverrideConfig = vi.hoisted(() => ({ override: null }));

const schemaOverrideFactory = () => schemaOverrideConfig.override;

const { DB_NAME, DB_VERSION, STORE_PROGRESS } = schemaModule;
const DEFAULT_IDS = [
  "push",
  "pull",
  "core",
  "legs",
  "grip",
  "utility",
  "settings"
];

function readRecord(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

describe("openDb.migration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetDbInstance();
  });

  it("opens the DB with the schema-provided name and version", async () => {
    const db = await openDb();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
  });

  it("runs migrations before seeding when upgrading from V0", async () => {
    const migrateSpy = vi.spyOn(schemaModule, "migrateFrom");

    const db = await openDb();

    expect(migrateSpy).toHaveBeenCalled();
    expect(migrateSpy.mock.calls[0][0]).toBe(0);

    const defaults = await Promise.all(
      DEFAULT_IDS.map(id => readRecord(db, STORE_PROGRESS, id))
    );
    defaults.forEach(record => expect(record).toBeTruthy());
  });

  it("keeps migrations idempotent even if migrateFrom executes twice", async () => {
    const realMigrate = schemaModule.migrateFrom;
    const doubleMigrate = vi
      .spyOn(schemaModule, "migrateFrom")
      .mockImplementation((oldVersion, db, tx) => {
        realMigrate(oldVersion, db, tx);
        realMigrate(oldVersion, db, tx);
      });

    let error = null;
    try {
      const db = await openDb();
      expect(db).toBeTruthy();
    } catch (err) {
      error = err;
    } finally {
      doubleMigrate.mockRestore();
    }

    if (error) {
      throw error;
    }
  });

  it("fails fast if migrations do not create the progress store", async () => {
    const migrateSpy = vi
      .spyOn(schemaModule, "migrateFrom")
      .mockImplementation(() => {});

    const failingOpen = openDb();
    failingOpen.catch(() => {});

    await expect(
      withTimeout(failingOpen, 250, "STORE_PROGRESS missing after migration")
    ).rejects.toHaveProperty("name", "NotFoundError");

    migrateSpy.mockRestore();
  });

  it("respects mocked schema exports for name, version, and store", async () => {
    const customName = "evergreen-schema-mock";
    const customStore = "custom_progress";
    const customVersion = 9;

    schemaOverrideConfig.override = {
      DB_NAME: customName,
      DB_VERSION: customVersion,
      STORE_PROGRESS: customStore,
      migrateFrom(oldVersion, db) {
        if (!db.objectStoreNames.contains(customStore)) {
          db.createObjectStore(customStore, { keyPath: "id" });
        }
      }
    };

    vi.resetModules();
    vi.doMock("../../../src/db/schema.js", schemaOverrideFactory);

    await deleteDatabase(customName);
    const mockedOpenDbModule = await import("../../../src/db/openDb.js");
    const mockedOpenDb = mockedOpenDbModule.openDb;
    const mockedReset = mockedOpenDbModule.__resetDbInstance;

    const db = await withTimeout(
      mockedOpenDb(),
      500,
      "mocked schema open timed out"
    );
    expect(db.name).toBe(customName);
    expect(db.version).toBe(customVersion);

    const settings = await readRecord(db, customStore, "settings");
    expect(settings).toBeTruthy();

    mockedReset();
    vi.resetModules();
    schemaOverrideConfig.override = null;
    await deleteDatabase(customName);
  });
});
