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

async function deleteDbWithTimeout(dbName, maxRetries = 3, retryDelay = 100) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const deleted = await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      
      // Successful deletion
      req.onsuccess = () => {
        resolve(true);
      };
      
      // Error during deletion
      req.onerror = () => {
        reject(req.error);
      };
      
      // Database is blocked - connections still open
      req.onblocked = () => {
        // Don't resolve - just note that it's blocked
        resolve(false);
      };
    });
    
    if (deleted === true) {
      return; // Success!
    }
    
    // If blocked, wait and retry
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
  
  // If we got here, deletion never succeeded but also never failed
  // This is the blocked state - try one more time without retrying
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    // Give up on onblocked - if it's still blocked, that's a problem with the test setup
  });
}
