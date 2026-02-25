import { describe, it, expect } from "vitest";
import { computeCompletionPercent, computeGlobalPercent } from "../../src/state/completion.js";
import { state } from "../../src/state/state.js";

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
});
