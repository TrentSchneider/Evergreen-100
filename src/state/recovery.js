// src/state/recovery.js

import { EvergreenConfig } from "../data/config.js";
import { todayString } from "../utils/dates.js";
import { loadStore } from "./storage.js";

// ---------------------------------------------------------
// Recovery Engine Integration
// ---------------------------------------------------------

// Check if an exercise is available today based on recovery rules
export async function isAvailable(ex) {
  const { loadHistory } = await loadStore();
  const { isExerciseAvailableOnDate } = await import("../recoveryEngine.js");

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();

      // Recovery is based on *previous* completions, not today's
      const filtered = history.filter(h => h.date !== today);

      const available = isExerciseAvailableOnDate(
        ex.id,
        today,
        filtered,
        EvergreenConfig
      );

      resolve(available);
    });
  });
}

// Get number of days remaining before an exercise becomes available
export async function daysRemaining(ex) {
  const { loadHistory } = await loadStore();
  const { getDaysRemaining } = await import("../recoveryEngine.js");

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(h => h.date !== today);

      const days = getDaysRemaining(
        ex.id,
        today,
        filtered,
        EvergreenConfig
      );

      resolve(days);
    });
  });
}
