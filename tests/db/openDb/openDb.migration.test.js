import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb } from "../../helpers/resetDb.js";
import { openDb, __resetDbInstance } from "../../../src/db/openDb.js";
import * as schemaModule from "../../../src/db/schema.js";
import { loadStressHistory } from "../../../src/db/progressStore.js";

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

function createMainStyleV3Db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("daily_logs")) {
        db.createObjectStore("daily_logs", { keyPath: "date" });
      }
    };

    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(["progress", "daily_logs"], "readwrite");

      tx.objectStore("progress").put({ id: "push", value: 12 });
      tx.objectStore("progress").put({
        id: "settings",
        value: {
          theme: "auto",
          layout: {
            settingsExpanded: false,
            tierExpanded: {},
            rowExpanded: {}
          },
          lastLogDate: "2026-02-01",
          streak: 2,
          longestStreak: 2
        }
      });

      // Legacy V3 shape: no stressLogs field.
      tx.objectStore("daily_logs").put({
        date: "2026-02-01",
        values: { push: 12 },
        completion: 48
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Legacy seed tx aborted"));
    };
  });
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
    vi.doUnmock("../../../src/db/schema.js");
    schemaOverrideConfig.override = null;
    await deleteDatabase(customName);
  });

  it("migrates a main-style V3 database to current schema without data loss", async () => {
    await createMainStyleV3Db();
    __resetDbInstance();

    const db = await openDb();

    expect(db.version).toBe(DB_VERSION);

    const progressTx = db.transaction(STORE_PROGRESS, "readonly");
    const progressStore = progressTx.objectStore(STORE_PROGRESS);

    expect(progressStore.indexNames.contains("byLastCompletedDate")).toBe(true);

    const push = await readRecord(db, STORE_PROGRESS, "push");
    expect(push).toBeTruthy();
    expect(push.value).toBe(12);

    await new Promise(resolve => {
      loadStressHistory(history => {
        expect(history).toHaveLength(1);
        expect(history[0].exId).toBe("push");
        expect(history[0].date).toBe("2026-02-01");
        resolve();
      });
    });
  });
});
