import { EXERCISES } from "../data/config.js";
import { state } from "./state.js";

// ---------------------------------------------------------
// Compute Completion Percent for a single exercise
// ---------------------------------------------------------
export function computeCompletionPercent(ex) {
  const value = state.values[ex.id] || 0;
  if (!ex.total) return 0;
  return (value / ex.total) * 100;
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
