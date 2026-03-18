// =========================================================
// Evergreen 100 — Progress Store Operations
// =========================================================

import { EvergreenConfig } from "../data/config.js";

// Lazy-load DB + schema only when needed
async function loadDb() {
  const { openDb } = await import("./openDb.js");
  const { STORE_PROGRESS, STORE_DAILY_LOGS } = await import("./schema.js");
  return { openDb, STORE_PROGRESS, STORE_DAILY_LOGS };
}

// ---------------------------------------------------------
// Get all exercise values
// ---------------------------------------------------------
export async function getAllValues(exercises) {
  const { openDb, STORE_PROGRESS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_PROGRESS, "readonly");
  const store = tx.objectStore(STORE_PROGRESS);

  const results = {};
  let remaining = exercises.length;

  return new Promise(resolve => {
    exercises.forEach(ex => {
      const req = store.get(ex.id);
      req.onsuccess = e => {
        results[ex.id] = e.target.result?.value ?? 0;
        remaining--;
        if (remaining === 0) resolve(results);
      };
    });
  });
}

// ---------------------------------------------------------
// Save a single exercise value
// ---------------------------------------------------------
export async function saveValue(id, value, todayString, callback) {
  const { openDb, STORE_PROGRESS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_PROGRESS, "readwrite");
  const store = tx.objectStore(STORE_PROGRESS);

  const getReq = store.get(id);
  getReq.onsuccess = e => {
    const existing = e.target.result || {
      id,
      value: 0,
      lastCompletedDate: null
    };

    const today = todayString();
    const newRecord = {
      id,
      value,
      lastCompletedDate: value > 0 ? today : existing.lastCompletedDate
    };

    store.put(newRecord);

    tx.oncomplete = () => callback && callback();
  };
}

// ---------------------------------------------------------
// Load settings
// ---------------------------------------------------------
export async function loadSettings(state, tiers, callback) {
  const { openDb, STORE_PROGRESS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_PROGRESS, "readonly");
  const store = tx.objectStore(STORE_PROGRESS);

  const req = store.get("settings");
  req.onsuccess = e => {
    const val = e.target.result?.value;

    if (val) {
      state.settings.theme = val.theme ?? "auto";
      state.settings.layout = {
        settingsExpanded: val.layout?.settingsExpanded ?? false,
        tierExpanded: val.layout?.tierExpanded ?? {},
        rowExpanded: val.layout?.rowExpanded ?? {}
      };
      state.settings.lastLogDate = val.lastLogDate ?? null;
      state.settings.streak = val.streak ?? 0;
      state.settings.longestStreak = val.longestStreak ?? 0;
    }

    tiers.forEach(t => {
      if (state.settings.layout.tierExpanded[t.id] === undefined) {
        state.settings.layout.tierExpanded[t.id] = !!t.defaultExpanded;
      }
    });

    callback && callback();
  };
}

// ---------------------------------------------------------
// Save settings
// ---------------------------------------------------------
export async function saveSettings(state) {
  const { openDb, STORE_PROGRESS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_PROGRESS, "readwrite");
  const store = tx.objectStore(STORE_PROGRESS);

  store.put({
    id: "settings",
    value: state.settings
  });
}

// ---------------------------------------------------------
// Snapshot a day's completion
// ---------------------------------------------------------
export async function snapshotDay(
  dateStr,
  values,
  computeCompletion,
  config,
  callback
) {
  const { openDb, STORE_DAILY_LOGS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_DAILY_LOGS, "readwrite");
  const store = tx.objectStore(STORE_DAILY_LOGS);

  // Backward compatibility: old signature was
  // snapshotDay(dateStr, values, computeCompletion, callback)
  const resolvedConfig =
    typeof config === "function" || !config ? null : config;
  const resolvedCallback =
    typeof config === "function" ? config : callback;

  const completion = computeCompletion();

  // Generate tissue stress logs from completed exercises
  const stressLogs = [];
  for (const [exerciseId, value] of Object.entries(values)) {
    if (value > 0) {
      const exercise = resolvedConfig?.exercises?.[exerciseId];
      if (exercise && exercise.tissues) {
        stressLogs.push({
          exId: exerciseId,
          date: dateStr,
          tissues: exercise.tissues // Already in { id, rank } format
        });
      }
    }
  }

  const log = {
    date: dateStr,
    values: { ...values },
    completion,
    stressLogs
  };

  return new Promise((resolve, reject) => {
    tx.onerror = () =>
      reject(tx.error || new Error("Snapshot transaction failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("Snapshot transaction aborted"));

    tx.oncomplete = async () => {
      try {
        if (resolvedCallback) {
          await resolvedCallback(completion);
        }
        resolve(completion);
      } catch (error) {
        reject(error);
      }
    };

    store.put(log);
  });
}

// ---------------------------------------------------------
// Load history
// ---------------------------------------------------------
export async function loadHistory(callback) {
  const { openDb, STORE_DAILY_LOGS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_DAILY_LOGS, "readonly");
  const store = tx.objectStore(STORE_DAILY_LOGS);

  const req = store.getAll();
  req.onsuccess = () => {
    const logs = req.result || [];

    // Keep existing consumer contract: latest first with completion + values.
    logs.sort((a, b) => (a.date < b.date ? 1 : -1));

    callback(logs);
  };
}

// ---------------------------------------------------------
// Load flattened stress history for recovery engine
// ---------------------------------------------------------
export async function loadStressHistory(callback) {
  const { openDb, STORE_DAILY_LOGS } = await loadDb();
  const db = await openDb();
  const tx = db.transaction(STORE_DAILY_LOGS, "readonly");
  const store = tx.objectStore(STORE_DAILY_LOGS);

  const req = store.getAll();
  req.onsuccess = () => {
    const logs = req.result || [];

    // Flatten stressLogs into engine format.
    // Fallback for older logs: derive stress events from stored values.
    const history = [];
    for (const log of logs) {
      if (Array.isArray(log.stressLogs) && log.stressLogs.length > 0) {
        history.push(...log.stressLogs);
        continue;
      }

      const values = log.values || {};
      for (const [exerciseId, value] of Object.entries(values)) {
        if (!(value > 0)) continue;

        const exercise = EvergreenConfig.exercises?.[exerciseId];
        if (!exercise?.tissues) continue;

        history.push({
          exId: exerciseId,
          date: log.date,
          tissues: exercise.tissues
        });
      }
    }

    // Sort by date (oldest → newest)
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    callback(history);
  };
}
