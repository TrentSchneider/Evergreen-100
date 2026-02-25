// =========================================================
// Evergreen 100 — IndexedDB Schema & Migrations (Patched)
// =========================================================

// These constants are safe to export — they contain no DB access.
export const DB_NAME = "evergreen100_v2";
export const DB_VERSION = 4;

export const STORE_PROGRESS = "progress";
export const STORE_DAILY_LOGS = "daily_logs";

// ---------------------------------------------------------
// Versioned Migration Dispatcher
// ---------------------------------------------------------
// IMPORTANT: All migrations must be synchronous and schema-only.
// No async reads/writes allowed inside onupgradeneeded.
export function migrateFrom(oldVersion, db, tx) {
  if (oldVersion < 1) setupV1(db);
  if (oldVersion < 2) setupV2(db); // patched: no async seeding
  if (oldVersion < 3) setupV3(db);
  if (oldVersion < 4) setupV4(db, tx); // index creation only
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
// V2 — (Patched) No async seeding allowed in migrations
// ---------------------------------------------------------
// Previously this seeded exercises + settings using async store.get()
// That deadlocks fake-indexeddb during tests.
// Now V2 is schema-only.
function setupV2(db) {
  // No schema changes needed here — seeding moved to openDb()
  // This migration is intentionally empty.
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
  if (!tx) return; // safety for tests

  const store = tx.objectStore(STORE_PROGRESS);

  if (!store.indexNames.contains("byLastCompletedDate")) {
    store.createIndex("byLastCompletedDate", "lastCompletedDate", {
      unique: false
    });
  }
}
