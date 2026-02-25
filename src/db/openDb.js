// =========================================================
// Evergreen 100 — DB Open Wrapper
// =========================================================

async function loadSchema() {
  const schema = await import("./schema.js");
  return {
    DB_NAME: schema.DB_NAME,
    DB_VERSION: schema.DB_VERSION,
    migrateFrom: schema.migrateFrom,
    STORE_PROGRESS: schema.STORE_PROGRESS
  };
}

let dbInstance = null;
let seedingPromise = null;
let openPromise = null;
let allConnections = new Set();

export async function openDb() {
  const { DB_NAME, DB_VERSION, migrateFrom, STORE_PROGRESS } =
    await loadSchema();

  if (openPromise) {
    await openPromise;
    if (seedingPromise) await seedingPromise;
    return dbInstance;
  }

  openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = event => {
      const db = req.result;
      const tx = req.transaction;
      migrateFrom(event.oldVersion, db, tx);
    };

    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      const db = req.result;
      dbInstance = db;
      allConnections.add(db);

      seedingPromise = seedDefaults(db, STORE_PROGRESS);

      seedingPromise.then(() => resolve(db));
    };
  });

  await openPromise;
  await seedingPromise;

  return dbInstance;
}

// ----------------------------------------------------------
// Safe post-open seeding
// ----------------------------------------------------------
function seedDefaults(db, STORE_PROGRESS) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    const store = tx.objectStore(STORE_PROGRESS);

    const defaultExercises = [
      "push",
      "pull",
      "core",
      "legs",
      "grip",
      "utility"
    ];

    defaultExercises.forEach(id => {
      store.get(id).onsuccess = e => {
        if (!e.target.result) {
          store.add({ id, value: 0, lastCompletedDate: null });
        }
      };
    });

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
