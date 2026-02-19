// recoveryEngine.test.js

import { describe, test, expect } from "vitest";

import {
  rankAdjustment,
  getRecoveryEntries,
  getCooldownDaysForEntry,
  getCooldownDaysForExercise,
  computeNextAvailableDate,
  isExerciseAvailableOnDate,
  getDaysRemaining
} from "../src/recoveryEngine.js";

// You can mock EvergreenConfig + helpers for tests:
global.EvergreenConfig = {
  recoveryTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  },
  recoveryRankMax: 5
};

global.todayString = () => "2026-02-18";
global.parseLocalDate = dateString => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
};

describe("rankAdjustment", () => {
  test("rank 1 → 0 extra days", () => {
    expect(rankAdjustment(1)).toBe(0);
  });

  test("rank 5 → 4 extra days", () => {
    expect(rankAdjustment(5)).toBe(4);
  });

  test("below 1 → 0", () => {
    expect(rankAdjustment(0)).toBe(0);
  });

  test("above max is clamped", () => {
    expect(rankAdjustment(10)).toBe(4);
  });
});

describe("getRecoveryEntries", () => {
  test("defaults to muscle rank 1 when missing", () => {
    const ex = { id: "test" };
    const entries = getRecoveryEntries(ex);
    expect(entries).toEqual([{ type: "muscle", rank: 1 }]);
  });

  test("returns existing recovery array", () => {
    const ex = { id: "test", recovery: [{ type: "tendon", rank: 3 }] };
    expect(getRecoveryEntries(ex)).toBe(ex.recovery);
  });
});

describe("getCooldownDaysForEntry", () => {
  test("muscle rank 1 → 0 days", () => {
    expect(getCooldownDaysForEntry({ type: "muscle", rank: 1 })).toBe(0);
  });

  test("tendon rank 3 → base 1 + (3-1)=3 days", () => {
    expect(getCooldownDaysForEntry({ type: "tendon", rank: 3 })).toBe(3);
  });

  test("unknown type falls back to muscle base", () => {
    expect(getCooldownDaysForEntry({ type: "unknown", rank: 5 })).toBe(0);
  });
});

describe("getCooldownDaysForExercise", () => {
  test("takes max across entries", () => {
    const ex = {
      recovery: [
        { type: "muscle", rank: 1 }, // 0
        { type: "tendon", rank: 3 }, // 3
        { type: "ligament", rank: 2 } // 3 (2 + (2-1))
      ]
    };
    expect(getCooldownDaysForExercise(ex)).toBe(3);
  });
});

describe("computeNextAvailableDate", () => {
  test("null lastCompletedDate → null", () => {
    const ex = { recovery: [{ type: "muscle", rank: 1 }] };
    expect(computeNextAvailableDate(null, ex)).toBeNull();
  });

  test("muscle rank 1 → no cooldown (null next date)", () => {
    const ex = { recovery: [{ type: "muscle", rank: 1 }] };
    const next = computeNextAvailableDate("2026-02-18", ex);
    expect(next).toBeNull();
  });

  test("tendon rank 3 → 3 days after", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    const next = computeNextAvailableDate("2026-02-18", ex);
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-21");
  });
});

describe("isExerciseAvailableOnDate", () => {
  test("never completed → available", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(isExerciseAvailableOnDate(null, ex, "2026-02-18")).toBe(true);
  });

  test("before next available date → not available", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(isExerciseAvailableOnDate("2026-02-18", ex, "2026-02-19")).toBe(
      false
    );
  });

  test("on or after next available date → available", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(isExerciseAvailableOnDate("2026-02-18", ex, "2026-02-21")).toBe(
      true
    );
  });
});

describe("getDaysRemaining", () => {
  test("never completed → 0", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(getDaysRemaining(null, ex, "2026-02-18")).toBe(0);
  });

  test("returns positive days until available", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(getDaysRemaining("2026-02-18", ex, "2026-02-19")).toBe(2);
  });

  test("on or after next date → 0", () => {
    const ex = { recovery: [{ type: "tendon", rank: 3 }] };
    expect(getDaysRemaining("2026-02-18", ex, "2026-02-21")).toBe(0);
  });
});
