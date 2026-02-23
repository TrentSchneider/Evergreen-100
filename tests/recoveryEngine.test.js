import { describe, it, expect, beforeEach } from "vitest";

// Import the recovery engine functions
import {
  rankAdjustment,
  getRecoveryEntries,
  getCooldownDaysForEntry,
  getCooldownDaysForExercise,
  computeNextAvailableDate,
  isExerciseAvailableOnDate,
  getDaysRemaining
} from "../src/recoveryEngine.js";

// ---------------------------------------------------------
// Mock EvergreenConfig + parseLocalDate
// ---------------------------------------------------------

global.EvergreenConfig = {
  recoveryRankMax: 5,
  recoveryTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  }
};

global.parseLocalDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

describe("Recovery Engine", () => {
  // -------------------------------------------------------
  // rankAdjustment
  // -------------------------------------------------------
  it("rankAdjustment clamps and subtracts 1", () => {
    expect(rankAdjustment(1)).toBe(0);
    expect(rankAdjustment(3)).toBe(2);
    expect(rankAdjustment(10)).toBe(4); // clamped to max=5 → 5-1=4
  });

  it("rankAdjustment returns 0 for invalid ranks", () => {
    expect(rankAdjustment(0)).toBe(0);
    expect(rankAdjustment(null)).toBe(0);
    expect(rankAdjustment(undefined)).toBe(0);
  });

  // -------------------------------------------------------
  // getRecoveryEntries
  // -------------------------------------------------------
  it("getRecoveryEntries returns default muscle rank 1 when missing", () => {
    expect(getRecoveryEntries({})).toEqual([{ type: "muscle", rank: 1 }]);
  });

  it("getRecoveryEntries returns provided entries", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(getRecoveryEntries(ex)).toEqual(ex.recovery);
  });

  // -------------------------------------------------------
  // getCooldownDaysForEntry
  // -------------------------------------------------------
  it("getCooldownDaysForEntry computes base + rankAdjustment", () => {
    expect(getCooldownDaysForEntry({ type: "muscle", rank: 1 })).toBe(0);
    expect(getCooldownDaysForEntry({ type: "tendon", rank: 2 })).toBe(1 + 1);
    expect(getCooldownDaysForEntry({ type: "ligament", rank: 5 })).toBe(2 + 4);
  });

  // -------------------------------------------------------
  // getCooldownDaysForExercise
  // -------------------------------------------------------
  it("getCooldownDaysForExercise returns max across entries", () => {
    const ex = {
      recovery: [
        { type: "muscle", rank: 1 },   // 0
        { type: "tendon", rank: 3 }    // 1 + 2 = 3
      ]
    };
    expect(getCooldownDaysForExercise(ex)).toBe(3);
  });

  // -------------------------------------------------------
  // computeNextAvailableDate
  // -------------------------------------------------------
  it("computeNextAvailableDate returns null when no lastCompletedDate", () => {
    expect(computeNextAvailableDate(null, {})).toBe(null);
  });

  it("computeNextAvailableDate returns null when cooldown is 0", () => {
    const ex = { recovery: [{ type: "muscle", rank: 1 }] }; // cooldown = 0
    expect(computeNextAvailableDate("2026-02-20", ex)).toBe(null);
  });

  it("computeNextAvailableDate adds cooldown days", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] }; // cooldown = 3
    const next = computeNextAvailableDate("2026-02-20", ex);
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-23");
  });

  // -------------------------------------------------------
  // isExerciseAvailableOnDate
  // -------------------------------------------------------
  it("isExerciseAvailableOnDate returns true when never completed", () => {
    expect(isExerciseAvailableOnDate(null, {}, "2026-02-22")).toBe(true);
  });

  it("isExerciseAvailableOnDate returns false when still cooling down", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] }; // cooldown = 3
    expect(isExerciseAvailableOnDate("2026-02-20", ex, "2026-02-21")).toBe(false);
  });

  it("isExerciseAvailableOnDate returns true when cooldown passed", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(isExerciseAvailableOnDate("2026-02-20", ex, "2026-02-24")).toBe(true);
  });

  // -------------------------------------------------------
  // getDaysRemaining
  // -------------------------------------------------------
  it("getDaysRemaining returns 0 when no lastCompletedDate", () => {
    expect(getDaysRemaining(null, {}, "2026-02-22")).toBe(0);
  });

  it("getDaysRemaining returns correct positive days", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] }; // cooldown = 3
    expect(getDaysRemaining("2026-02-20", ex, "2026-02-21")).toBe(2);
  });

  it("getDaysRemaining returns 0 when cooldown passed", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(getDaysRemaining("2026-02-20", ex, "2026-02-25")).toBe(0);
  });
});
