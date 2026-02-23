// =========================================================
// Evergreen 100 — DB Open Wrapper (Final Patched Version)
// =========================================================

async function loadSchema() {
  const schema = await import("./schema.js");
  return {
    DB_NAME: schema.DB_NAME,
    DB_VERSION: schema.DB_VERSION,
    migrateFrom: schema.migrateFrom
  };
}

let dbInstance = null;
let allConnections = new Set();

export async function openDb() {
  if (dbInstance) return dbInstance;

  const { DB_NAME, DB_VERSION, migrateFrom } = await loadSchema();

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = event => {
      const db = req.result;
      const tx = req.transaction;
      migrateFrom(event.oldVersion, db, tx);
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      allConnections.add(dbInstance);
      resolve(dbInstance);
    };

    req.onerror = () => reject(req.error);
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
}

// ----------------------------------------------------------
// TEST-ONLY: Reset cached instance
// ----------------------------------------------------------
export function __resetDbInstance() {
  dbInstance = null;
}
