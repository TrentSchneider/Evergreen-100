// =========================================================
// Evergreen 100 — IndexedDB Schema & Migrations
// =========================================================

export const DB_NAME = "evergreen100_v2";
export const DB_VERSION = 4;

export const STORE_PROGRESS = "progress";
export const STORE_DAILY_LOGS = "daily_logs";

// ---------------------------------------------------------
// Versioned Migration Dispatcher
// ---------------------------------------------------------
export function migrateFrom(oldVersion, db, tx) {
  if (oldVersion < 1) setupV1(db);
  if (oldVersion < 2) setupV2(db, tx);
  if (oldVersion < 3) setupV3(db);
  if (oldVersion < 4) setupV4(db, tx); // NEW MIGRATION
}

// ---------------------------------------------------------
// V1 — Create progress store
// ---------------------------------------------------------
function setupV1(db) {
  if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
    db.createObjectStore(STORE_PROGRESS, { keyPath: "id" });
  }
}

// ---------------------------------------------------------
// V2 — Seed exercises + settings
// ---------------------------------------------------------
function setupV2(db, tx) {
  const store = tx.objectStore(STORE_PROGRESS);

  // Seed exercises
  const defaultExercises = [
    "push",
    "pull",
    "core",
    "legs",
    "grip",
    "utility"
  ];

  defaultExercises.forEach(id => {
    const req = store.get(id);
    req.onsuccess = e => {
      if (!e.target.result) {
        store.add({ id, value: 0, lastCompletedDate: null });
      }
    };
  });

  // Seed settings
  const settingsReq = store.get("settings");
  settingsReq.onsuccess = e => {
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
}

// ---------------------------------------------------------
// V3 — Create daily_logs store
// ---------------------------------------------------------
function setupV3(db) {
  if (!db.objectStoreNames.contains(STORE_DAILY_LOGS)) {
    db.createObjectStore(STORE_DAILY_LOGS, { keyPath: "date" });
  }
}

// ---------------------------------------------------------
// V4 — Add lastCompletedDate index
// ---------------------------------------------------------
function setupV4(db, tx) {
  const store = tx.objectStore(STORE_PROGRESS);

  if (!store.indexNames.contains("byLastCompletedDate")) {
    store.createIndex("byLastCompletedDate", "lastCompletedDate", {
      unique: false
    });
  }
}
