import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb } from "../../helpers/resetDb.js";
import { openDb, __resetDbInstance } from "../../../src/db/openDb.js";
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

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

describe("openDb.seeding", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetDbInstance();
  });

  it("waits for defaults to be present before resolving", async () => {
    const db = await openDb();
    const seeded = await Promise.all(
      DEFAULT_IDS.map(id => readProgressRecord(db, id))
    );

    seeded.forEach(record => {
      expect(record).toBeTruthy();
    });
  });

  it("preserves existing user data when reseeding", async () => {
    const db = await openDb();
    await writeProgressRecord(db, {
      id: "legs",
      value: 99,
      lastCompletedDate: "2024-01-01"
    });

    __resetDbInstance();
    const reopened = await openDb();
    const legs = await readProgressRecord(reopened, "legs");

    expect(legs.value).toBe(99);
    expect(legs.lastCompletedDate).toBe("2024-01-01");
  });

  it("detects stalled seeding transactions", async () => {
    const originalTransaction = IDBDatabase.prototype.transaction;

    IDBDatabase.prototype.transaction = function (...args) {
      const tx = originalTransaction.apply(this, args);
      Object.defineProperty(tx, "oncomplete", {
        configurable: true,
        enumerable: true,
        get() {
          return undefined;
        },
        set() {
          // swallow the handler so the seeding promise never resolves
        }
      });
      return tx;
    };

    await expect(
      withTimeout(openDb(), 75, "Seeding transaction stalled")
    ).rejects.toThrow("Seeding transaction stalled");

    IDBDatabase.prototype.transaction = originalTransaction;
  });
});
