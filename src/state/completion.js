import { EXERCISES } from "../data/config.js";
import { state } from "./state.js";

// ---------------------------------------------------------
// Compute Completion Percent (0–100)
// ---------------------------------------------------------
export function computeCompletionPercent() {
  const totalRequired = EXERCISES.reduce((sum, ex) => sum + ex.total, 0);
  const totalDone = EXERCISES.reduce(
    (sum, ex) => sum + (state.values[ex.id] || 0),
    0
  );

  if (totalRequired === 0) return 0;

  return Math.max(0, Math.min(1, totalDone / totalRequired)) * 100;
}

// ---------------------------------------------------------
// Compute Global Percent (0–100)
// ---------------------------------------------------------
export function computeGlobalPercent() {
  const totalRequired = EXERCISES.reduce((sum, ex) => sum + ex.total, 0);
  const totalDone = EXERCISES.reduce(
    (sum, ex) => sum + (state.values[ex.id] || 0),
    0
  );

  return Math.max(0, Math.min(1, totalDone / totalRequired)) * 100;
}
