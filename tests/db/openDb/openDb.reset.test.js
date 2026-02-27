import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb } from "../../helpers/resetDb.js";
import {
  openDb,
  __resetDbInstance,
  __closeDbInstance
} from "../../../src/db/openDb.js";
import { STORE_PROGRESS } from "../../../src/db/schema.js";

const DEFAULT_IDS = [
  "push",
  "pull",
  "core",
  "legs",
  "grip",
  "utility",
  "settings"
];

function readProgressRecord(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readonly");
    const store = tx.objectStore(STORE_PROGRESS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function writeProgressRecord(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    const store = tx.objectStore(STORE_PROGRESS);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

describe("openDb.reset", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetDbInstance();
  });

  it("forces a fresh open request after __resetDbInstance()", async () => {
    const openSpy = vi.spyOn(indexedDB, "open");

    await openDb();
    await openDb();
    expect(openSpy).toHaveBeenCalledTimes(1);

    __resetDbInstance();
    await openDb();
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it("closes all connections and clears caches when __closeDbInstance() runs", async () => {
    const openSpy = vi.spyOn(indexedDB, "open");
    const db = await openDb();
    const closeSpy = vi.spyOn(db, "close");

    __closeDbInstance();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    await openDb();
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps allConnections unique and empty after close", async () => {
    await Promise.all([openDb(), openDb(), openDb()]);
    const db = await openDb();
    const closeSpy = vi.spyOn(db, "close");

    __closeDbInstance();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    __closeDbInstance();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("performs a full reset cycle and recreates defaults", async () => {
    const db = await openDb();
    await writeProgressRecord(db, {
      id: "custom",
      value: 7,
      lastCompletedDate: null
    });

    await resetDb();
    const reopened = await openDb();
    const custom = await readProgressRecord(reopened, "custom");
    expect(custom).toBeUndefined();

    const defaults = await Promise.all(
      DEFAULT_IDS.map(id => readProgressRecord(reopened, id))
    );
    defaults.forEach(record => expect(record).toBeTruthy());
  });
});
