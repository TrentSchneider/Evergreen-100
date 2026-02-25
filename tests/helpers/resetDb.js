// tests/helpers/resetDb.js
import { __closeDbInstance, __resetDbInstance } from "../../src/db/openDb.js";
import { DB_NAME } from "../../src/db/schema.js";

export async function resetDb() {
  // 1. Close all open connections
  __closeDbInstance();

  // 2. Reset cached promises
  __resetDbInstance();

  // 3. Delete the database
  await new Promise(resolve => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = resolve;
    req.onerror = resolve;
    req.onblocked = resolve;
  });
}
