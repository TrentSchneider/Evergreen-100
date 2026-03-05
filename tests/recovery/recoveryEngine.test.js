import { describe, it, expect } from "vitest";

import {
  rankAdjustment,
  getCooldownDaysForEntry,
  getCooldownDaysForExercise,
  computeNextAvailableDate,
  isExerciseAvailableOnDate,
  getDaysRemaining
} from "../../src/recoveryEngine.js";

// ---------------------------------------------------------
// Local Test Config + parseLocalDate
// ---------------------------------------------------------

const TestRecoveryConfig = {
  recoveryRankMax: 5,
  recoveryTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  }
};

function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

describe("Recovery Engine", () => {
  // -------------------------------------------------------
  // rankAdjustment
  // -------------------------------------------------------
  it("rankAdjustment clamps and subtracts 1", () => {
    expect(rankAdjustment(1, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(3, TestRecoveryConfig)).toBe(2);
    expect(rankAdjustment(10, TestRecoveryConfig)).toBe(4);
  });

  it("rankAdjustment returns 0 for invalid ranks", () => {
    expect(rankAdjustment(0, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(null, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(undefined, TestRecoveryConfig)).toBe(0);
  });

  // -------------------------------------------------------
  // getCooldownDaysForEntry
  // -------------------------------------------------------
  it("getCooldownDaysForEntry computes base + rankAdjustment", () => {
    expect(
      getCooldownDaysForEntry({ type: "muscle", rank: 1 }, TestRecoveryConfig)
    ).toBe(0);
    expect(
      getCooldownDaysForEntry({ type: "tendon", rank: 2 }, TestRecoveryConfig)
    ).toBe(2);
    expect(
      getCooldownDaysForEntry({ type: "ligament", rank: 5 }, TestRecoveryConfig)
    ).toBe(6);
  });

  // -------------------------------------------------------
  // getCooldownDaysForExercise
  // -------------------------------------------------------
  it("getCooldownDaysForExercise returns max across history entries", () => {
    const history = [
      { exId: "push", type: "muscle", rank: 1 }, // 0
      { exId: "push", type: "tendon", rank: 3 } // 1 + 2 = 3
    ];

    expect(
      getCooldownDaysForExercise("push", history, TestRecoveryConfig)
    ).toBe(3);
  });

  // -------------------------------------------------------
  // computeNextAvailableDate
  // -------------------------------------------------------
  it("computeNextAvailableDate returns null when no history", () => {
    expect(
      computeNextAvailableDate("push", "2026-02-20", [], TestRecoveryConfig)
    ).toBe(null);
  });

  it("computeNextAvailableDate returns null when cooldown is 0", () => {
    const history = [
      { exId: "push", type: "muscle", rank: 1 } // cooldown = 0
    ];

    expect(
      computeNextAvailableDate(
        "push",
        "2026-02-20",
        history,
        TestRecoveryConfig
      )
    ).toBe(null);
  });

  it("computeNextAvailableDate adds cooldown days", () => {
    const history = [
      { exId: "push", type: "tendon", rank: 3, date: "2026-02-20" }
    ];

    const next = computeNextAvailableDate(
      "push",
      "2026-02-20",
      history,
      TestRecoveryConfig
    );
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-23");
  });

  // -------------------------------------------------------
  // isExerciseAvailableOnDate
  // -------------------------------------------------------
  it("isExerciseAvailableOnDate returns true when never completed", () => {
    expect(
      isExerciseAvailableOnDate("push", "2026-02-22", [], TestRecoveryConfig)
    ).toBe(true);
  });

  it("isExerciseAvailableOnDate returns false when still cooling down", () => {
    const history = [
      { exId: "push", type: "tendon", rank: 3 } // cooldown = 3
    ];

    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-21",
        history,
        TestRecoveryConfig
      )
    ).toBe(false);
  });

  it("isExerciseAvailableOnDate returns true when cooldown passed", () => {
    const history = [
      { exId: "push", type: "tendon", rank: 3, date: "2026-02-20" }
    ];

    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-24",
        history,
        TestRecoveryConfig
      )
    ).toBe(true);
  });

  // -------------------------------------------------------
  // getDaysRemaining
  // -------------------------------------------------------
  it("getDaysRemaining returns 0 when no history", () => {
    expect(getDaysRemaining("push", "2026-02-22", [], TestRecoveryConfig)).toBe(
      0
    );
  });

  it("getDaysRemaining returns correct positive days", () => {
    const history = [
      { exId: "push", type: "tendon", rank: 3, date: "2026-02-20" }
    ];

    expect(
      getDaysRemaining("push", "2026-02-21", history, TestRecoveryConfig)
    ).toBe(2);
  });

  it("getDaysRemaining returns 0 when cooldown passed", () => {
    const history = [{ exId: "push", type: "tendon", rank: 3 }];

    expect(
      getDaysRemaining("push", "2026-02-25", history, TestRecoveryConfig)
    ).toBe(0);
  });
});
