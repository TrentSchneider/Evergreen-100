import { describe, it, expect, beforeEach } from "vitest";
import { computeGlobalPercent } from "../../src/state/completion.js";
import { state } from "../../src/state/state.js";

describe("completion calculations with recovery filtering", () => {
  beforeEach(() => {
    state.values = {};
  });

  it("computes global percent with filtered exercises list", () => {
    const allExercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 },
      { id: "c", total: 10 }
    ];

    const availableExercises = [
      { id: "a", total: 10 },
      { id: "c", total: 10 }
    ];

    state.values = { a: 5, b: 5, c: 10 };

    // Only 'b' is recovering, so only 'a' and 'c' count
    const percent = computeGlobalPercent(availableExercises, state.values);

    // (5/10 + 10/10) / 2 = 75%
    expect(percent).toBe(75);
  });

  it("returns 0 when only recovering exercises exist", () => {
    const availableExercises = [];
    state.values = { a: 10, b: 10 };

    const percent = computeGlobalPercent(availableExercises, state.values);

    expect(percent).toBe(0);
  });

  it("correctly filters one recovering exercise from three", () => {
    const available = [
      { id: "a", total: 20 },
      { id: "c", total: 20 }
    ];

    state.values = { a: 20, b: 20, c: 10 };

    const percent = computeGlobalPercent(available, state.values);

    // (20/20 + 10/20) / 2 = (1 + 0.5) / 2 = 75%
    expect(percent).toBe(75);
  });

  it("handles all exercises being available", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 },
      { id: "c", total: 10 }
    ];

    state.values = { a: 5, b: 8, c: 10 };

    // No exercises are recovering
    const percent = computeGlobalPercent(exercises, state.values);

    // (5/10 + 8/10 + 10/10) / 3 = (0.5 + 0.8 + 1) / 3 = 76.67%
    expect(percent).toBeCloseTo(76.67, 1);
  });

  it("handles single available exercise", () => {
    const available = [
      { id: "a", total: 10 }
    ];

    state.values = { a: 5 };

    const percent = computeGlobalPercent(available, state.values);

    // 5/10 = 50%
    expect(percent).toBe(50);
  });

  it("handles missing values in state as zero", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 }
    ];

    // Only set value for 'a', 'b' is missing
    state.values = { a: 10 };

    const percent = computeGlobalPercent(exercises, state.values);

    // (10/10 + 0/10) / 2 = 50%
    expect(percent).toBe(50);
  });
});
