import { describe, it, expect } from "vitest";
import { computeCompletionPercent, computeGlobalPercent } from "../../src/state/completion.js";
import { state } from "../../src/state/state.js";
import { EXERCISES } from "../../src/data/config.js";

describe("completion calculations", () => {
  it("computes completion percent for a single exercise", () => {
    const ex = { id: "test", total: 10 };

    // Set the state value because the real function reads from state
    state.values = { test: 0 };
    expect(computeCompletionPercent(ex)).toBe(0);

    state.values = { test: 10 };
    expect(computeCompletionPercent(ex)).toBe(100);

    state.values = { test: 20 };
    expect(computeCompletionPercent(ex)).toBeGreaterThan(100);
  });

  it("computes global percent across all exercises", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 }
    ];

    state.values = { a: 10, b: 10 };

    expect(computeGlobalPercent(exercises, state.values)).toBe(100);
  });

  it("computes global average when no exercise is specified", () => {
    // This will use EXERCISES from config
    state.values = {};
    
    const result = computeCompletionPercent();
    
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("computes global percent with partial completions", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 20 },
      { id: "c", total: 30 }
    ];

    state.values = { a: 5, b: 10, c: 15 };

    expect(computeGlobalPercent(exercises, state.values)).toBe(50);
  });

  it("returns 0 for global percent when no exercises exist", () => {
    const exercises = [];
    state.values = {};

    expect(computeGlobalPercent(exercises, state.values)).toBe(0);
  });

  it("handles missing values in state as zero", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 }
    ];

    // Only set value for 'a', 'b' is missing
    state.values = { a: 10 };

    expect(computeGlobalPercent(exercises, state.values)).toBe(50);
  });

  it("caps individual exercise ratios at 100% for global average", () => {
    state.values = Object.fromEntries(EXERCISES.map(ex => [ex.id, 0]));
    state.values[EXERCISES[0].id] = EXERCISES[0].total * 2;

    // computeCompletionPercent without arg uses EXERCISES and caps each ratio at 1
    // so only one exercise contributes full completion to the average.
    const avgPercent = computeCompletionPercent();

    expect(avgPercent).toBeCloseTo(100 / EXERCISES.length, 5);
  });

  it("caps over-completed exercise contribution in equal-weight global percent", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 10 }
    ];

    // A is 200%, B is 0% -> capped ratios are 1 and 0, average is 50%
    state.values = { a: 20, b: 0 };

    expect(computeGlobalPercent(exercises, state.values)).toBe(50);
  });

  it("uses equal weighting even when totals differ", () => {
    const exercises = [
      { id: "a", total: 10 },
      { id: "b", total: 30 }
    ];

    // A overshoots to 100%, B is 50% complete -> (1 + 0.5) / 2 = 75%
    state.values = { a: 20, b: 15 };

    expect(computeGlobalPercent(exercises, state.values)).toBe(75);
  });
});
