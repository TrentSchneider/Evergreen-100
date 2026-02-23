import * as openDbModule from "../../src/db/openDb.js";
import { DB_NAME } from "../../src/db/schema.js";

const { openDb, __closeDbInstance, __resetDbInstance } = openDbModule;

export async function resetDb() {
  // 1. Close ALL open connections
  __closeDbInstance();

  // 2. Reset cached instance
  __resetDbInstance();

  // 3. Delete the database
  await new Promise(resolve => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = resolve;
    req.onerror = resolve;
  });

  // 4. Re-open DB so migrations run fresh
  await openDb();
}
