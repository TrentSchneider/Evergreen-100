// ---------------------------------------------------------
// Lazy-load DB Store Functions
// ---------------------------------------------------------
export async function loadStore() {
  // Ensure DB is fully ready before exposing store functions
  const { openDb } = await import("../db/openDb.js");
  await openDb();

  return await import("../db/progressStore.js");
}

// ---------------------------------------------------------
// Lazy-load DB Initialization
// ---------------------------------------------------------
export async function initDb() {
  const { openDb } = await import("../db/openDb.js");
  await openDb();   // ensure DB + seeding complete
}
