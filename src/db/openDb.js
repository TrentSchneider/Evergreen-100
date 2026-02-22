// =========================================================
// Evergreen 100 — DB Open Wrapper
// =========================================================

import { DB_NAME, DB_VERSION, migrateFrom } from "./schema.js";

let dbInstance = null;

export function openDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = event => {
      const db = req.result;
      const tx = req.transaction;
      migrateFrom(event.oldVersion, db, tx);
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };

    req.onerror = () => reject(req.error);
  });
}
