import { EXERCISES } from "../data/config.js";
import { state } from "./state.js";

// ---------------------------------------------------------
// Compute Completion Percent (0–100)
// ---------------------------------------------------------
export function computeCompletionPercent() {
  const ratios = EXERCISES.map(ex => {
    const value = state.values[ex.id] || 0;
    return Math.min(1, value / ex.total);
  });

  const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return avg * 100;
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
