import { EXERCISES } from "../data/config.js";
import { state } from "./state.js";

// ---------------------------------------------------------
// Compute Completion Percent (0–100) – for single exercise or global
// ---------------------------------------------------------
export function computeCompletionPercent(exercise) {
  // If a single exercise is provided, compute just for that exercise
  if (exercise) {
    const value = state.values[exercise.id] || 0;
    const ratio = value / exercise.total;
    return ratio * 100;
  }

  // Otherwise, global average across all exercises
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
  if (!exercises.length) return 0;

  const ratios = exercises.map(ex => {
    const value = values[ex.id] || 0;
    return Math.min(1, value / ex.total);
  });

  const avg = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return avg * 100;
}
