// ---------------------------------------------------------
// Lazy-load DB Store Functions
// ---------------------------------------------------------
export async function loadStore() {
  // Loads: getAllValues, saveValue, loadHistory, loadSettings, saveSettings, snapshotDay
  return await import("../db/progressStore.js");
}

// ---------------------------------------------------------
// Lazy-load DB Initialization
// ---------------------------------------------------------
export async function initDb() {
  const { openDb } = await import("../db/openDb.js");
  return openDb();
}
