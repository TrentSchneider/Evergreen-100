// =========================================================
// Evergreen 100 — DB Open Wrapper
// =========================================================

import { EvergreenConfig } from "../data/config.js";

async function loadSchema() {
  try {
    const schema = await import("./schema.js");
    return {
      DB_NAME: schema.DB_NAME,
      DB_VERSION: schema.DB_VERSION,
      migrateFrom: schema.migrateFrom,
      STORE_PROGRESS: schema.STORE_PROGRESS
    };
  } catch (error) {
    throw (error && error.cause) || error;
  }
}

let dbInstance = null;
let seedingPromise = null;
let openPromise = null;
let allConnections = new Set();

export async function openDb() {
  const { DB_NAME, DB_VERSION, migrateFrom, STORE_PROGRESS } = await loadSchema();

  if (dbInstance && dbInstance.name !== DB_NAME) {
    __resetDbInstance();
  }

  if (openPromise) {
    await openPromise;
    if (seedingPromise) await seedingPromise;
    return dbInstance;
  }

  openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let openedDb = null;

    const fail = error => {
      if (openedDb) {
        try {
          openedDb.close();
        } catch (_) {}
        allConnections.delete(openedDb);
        if (dbInstance === openedDb) dbInstance = null;
      }
      openPromise = null;
      seedingPromise = null;
      reject(error);
    };

    req.onupgradeneeded = event => {
      const db = req.result;
      const tx = req.transaction;
      migrateFrom(event.oldVersion, db, tx);
    };

    req.onerror = () =>
      fail(req.error || new Error("Failed to open IndexedDB"));

    req.onsuccess = () => {
      openedDb = req.result;
      dbInstance = openedDb;
      allConnections.add(openedDb);

      openedDb.onversionchange = () => {
        try {
          openedDb.close();
        } catch (_) {}
        allConnections.delete(openedDb);
        if (dbInstance === openedDb) {
          dbInstance = null;
          openPromise = null;
          seedingPromise = null;
        }
      };

      seedingPromise = seedDefaults(openedDb, STORE_PROGRESS);
      seedingPromise.then(() => resolve(openedDb), fail);
    };
  });

  await openPromise;
  if (seedingPromise) await seedingPromise;

  return dbInstance;
}

// ----------------------------------------------------------
// Safe post-open seeding
// ----------------------------------------------------------
function seedDefaults(db, STORE_PROGRESS) {
  return new Promise((resolve, reject) => {
    let tx;

    try {
      tx = db.transaction(STORE_PROGRESS, "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    tx.onerror = () =>
      reject(tx.error || new Error("Seeding transaction failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("Seeding transaction aborted"));

    const store = tx.objectStore(STORE_PROGRESS);

    // Seed progress entries for every exercise
    const exerciseIds = Object.keys(EvergreenConfig.exercises);

    exerciseIds.forEach(id => {
      store.get(id).onsuccess = e => {
        if (!e.target.result) {
          store.add({ id, value: 0, lastCompletedDate: null });
        }
      };
    });

    // Seed settings
    store.get("settings").onsuccess = e => {
      if (!e.target.result) {
        store.add({
          id: "settings",
          value: {
            theme: "auto",
            layout: {
              settingsExpanded: false,
              tierExpanded: {},
              rowExpanded: {}
            },
            lastLogDate: null,
            streak: 0,
            longestStreak: 0
          }
        });
      }
    };

    tx.oncomplete = () => resolve();
  });
}

// ----------------------------------------------------------
// TEST-ONLY: Close ALL open DB connections
// ----------------------------------------------------------
export function __closeDbInstance() {
  for (const db of allConnections) {
    try {
      db.close();
    } catch (_) {}
  }
  allConnections.clear();
  dbInstance = null;
  seedingPromise = null;
  openPromise = null;
}

// ----------------------------------------------------------
// TEST-ONLY: Reset cached instance
// ----------------------------------------------------------
export function __resetDbInstance() {
  dbInstance = null;
  seedingPromise = null;
  openPromise = null;
}
