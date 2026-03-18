// =========================================================
// Evergreen 100 — IndexedDB Schema & Migrations
// =========================================================

export const DB_NAME = "evergreen100_v2";
export const DB_VERSION = 5;

export const STORE_PROGRESS = "progress";
export const STORE_DAILY_LOGS = "daily_logs";

// ---------------------------------------------------------
// Versioned Migration Dispatcher
// ---------------------------------------------------------
// IMPORTANT: All migrations must be synchronous and schema-only.
// No async reads/writes allowed inside onupgradeneeded.
export function migrateFrom(oldVersion, db, tx) {
  if (oldVersion < 1) setupV1(db);
  if (oldVersion < 2) setupV2(db);
  if (oldVersion < 3) setupV3(db);
  if (oldVersion < 4) setupV4(db, tx);
  if (oldVersion < 5) setupV5(db, tx);
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
function setupV2(db) {
  // No schema changes — seeding moved to openDb()
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
  if (!tx) return;

  const store = tx.objectStore(STORE_PROGRESS);

  if (!store.indexNames.contains("byLastCompletedDate")) {
    store.createIndex("byLastCompletedDate", "lastCompletedDate", {
      unique: false
    });
  }
}

// ---------------------------------------------------------
// V5 — Prepare for stressLogs in daily_logs
// ---------------------------------------------------------
function setupV5(db, tx) {
  // Schema change: daily_logs entries will now have a `stressLogs` field
  // This is a version bump for compatibility — no schema restructuring needed
  // since IndexedDB is schema-less at the object store level.
}
