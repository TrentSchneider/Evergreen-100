// src/state/recovery.js

import { EvergreenConfig } from "../data/config.js";
import { todayString } from "../utils/dates.js";
import { loadStore } from "./storage.js";

// ---------------------------------------------------------
// Recovery Engine Integration
// ---------------------------------------------------------

/**
 * Is an exercise available today?
 */
export async function isAvailable(exerciseId) {
  const store = await loadStore();
  const loadHistory = store.loadStressHistory || store.loadHistory;
  const { isExerciseAvailableOnDate } = await import("../recoveryEngine.js");

  const exId = typeof exerciseId === "string" ? exerciseId : exerciseId?.id;

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(
        h => String(h.date).slice(0, 10) !== today
      );

      const available = isExerciseAvailableOnDate(
        exId,
        today,
        filtered,
        EvergreenConfig
      );

      resolve(available);
    });
  });
}

/**
 * Days remaining until an exercise is available.
 */
export async function daysRemaining(exerciseId) {
  const store = await loadStore();
  const loadHistory = store.loadStressHistory || store.loadHistory;
  const { getDaysRemaining } = await import("../recoveryEngine.js");

  const exId = typeof exerciseId === "string" ? exerciseId : exerciseId?.id;

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(
        h => String(h.date).slice(0, 10) !== today
      );

      const days = getDaysRemaining(exId, today, filtered, EvergreenConfig);

      resolve(days);
    });
  });
}

/**
 * Get detailed tissue blocking info.
 * Useful for UI: "Chest still recovering 3 days"
 */
export async function getBlockedTissues(exerciseId) {
  const store = await loadStore();
  const loadHistory = store.loadStressHistory || store.loadHistory;
  const { getBlockedTissues } = await import("../recoveryEngine.js");

  const exId = typeof exerciseId === "string" ? exerciseId : exerciseId?.id;

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(
        h => String(h.date).slice(0, 10) !== today
      );

      const blocked = getBlockedTissues(exId, today, filtered, EvergreenConfig);

      resolve(blocked);
    });
  });
}

/**
 * Get region-level readiness (scaffolding for future UI).
 * Example: { upper: 0.65, core: 0.8, lower: 0.3 }
 */
export async function getRegionReadiness() {
  const store = await loadStore();
  const loadHistory = store.loadStressHistory || store.loadHistory;
  const { computeRegionReadiness } = await import("../recoveryEngine.js");

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(
        h => String(h.date).slice(0, 10) !== today
      );

      const regions = computeRegionReadiness(today, filtered, EvergreenConfig);

      resolve(regions);
    });
  });
}
