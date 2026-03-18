// tests/helpers/resetDb.js
import { __closeDbInstance, __resetDbInstance } from "../../src/db/openDb.js";
import { DB_NAME } from "../../src/db/schema.js";

export async function resetDb() {
  // 1. Close all open connections
  __closeDbInstance();

  // 2. Reset cached promises
  __resetDbInstance();

  // 3. Delete the database with timeout handling
  await deleteDbWithTimeout(DB_NAME);
}

async function deleteDbWithTimeout(
  dbName,
  totalTimeout = 2000,
  retryDelay = 100
) {
  const deadline = Date.now() + totalTimeout;

  while (true) {
    const deleted = await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(false);
    });

    if (deleted === true) {
      return; // success
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `deleteDatabase(${dbName}) remained blocked after ${totalTimeout}ms`
      );
    }

    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
}
