import { EXERCISES } from "../data/config.js";
import { state } from "./state.js";

// ---------------------------------------------------------
// Compute Completion Percent (0–100) – global average across exercises
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
export function computeGlobalPercent(
  exercises = EXERCISES,
  values = state.values
) {
  const totalRequired = exercises.reduce((sum, ex) => sum + ex.total, 0);
  const totalDone = exercises.reduce(
    (sum, ex) => sum + (values[ex.id] || 0),
    0
  );

  if (totalRequired === 0) return 0;

  return (totalDone / totalRequired) * 100;
}
