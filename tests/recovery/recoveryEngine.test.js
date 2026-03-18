import { describe, it, expect } from "vitest";

import {
  rankAdjustment,
  getBaseCooldownDaysForTissue,
  defaultRecoveryCurves,
  isExerciseAvailableOnDate,
  getTissueEventsFromHistory,
  computeTissueReadiness
} from "../../src/recoveryEngine.js";

// ---------------------------------------------------------
// Local Test Config (updated for proportional model)
// ---------------------------------------------------------

const TestRecoveryConfig = {
  recoveryRankMax: 10,
  tissueTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  },
  tissues: [
    { id: "test_muscle", type: "muscle", region: "upper" },
    { id: "test_tendon", type: "tendon", region: "upper" },
    { id: "test_ligament", type: "ligament", region: "upper" }
  ],
  exercises: {
    push: {
      tissues: [
        { id: "test_tendon", rank: 3 }, // light tendon load
        { id: "test_ligament", rank: 4 } // light ligament load
      ]
    }
  }
};

// ---------------------------------------------------------
// Tests
// ---------------------------------------------------------

describe("Recovery Engine (Proportional Model)", () => {
  // -------------------------------------------------------
  // rankAdjustment (legacy helper)
  // -------------------------------------------------------
  it("rankAdjustment clamps and subtracts 1", () => {
    expect(rankAdjustment(1, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(3, TestRecoveryConfig)).toBe(2);
    expect(rankAdjustment(10, TestRecoveryConfig)).toBe(9);
  });

  it("rankAdjustment returns 0 for invalid ranks", () => {
    expect(rankAdjustment(0, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(null, TestRecoveryConfig)).toBe(0);
    expect(rankAdjustment(undefined, TestRecoveryConfig)).toBe(0);
  });

  // -------------------------------------------------------
  // Base cooldown lookup
  // -------------------------------------------------------
  it("returns base cooldown days from tissue id", () => {
    expect(
      getBaseCooldownDaysForTissue("test_muscle", TestRecoveryConfig)
    ).toBe(0);
    expect(
      getBaseCooldownDaysForTissue("test_tendon", TestRecoveryConfig)
    ).toBe(1);
    expect(
      getBaseCooldownDaysForTissue("test_ligament", TestRecoveryConfig)
    ).toBe(2);
    expect(getBaseCooldownDaysForTissue("missing", TestRecoveryConfig)).toBe(0);
  });

  // -------------------------------------------------------
  // Curves with no events
  // -------------------------------------------------------
  it("curve functions return full readiness without events", () => {
    const targetDate = new Date("2026-02-21");

    expect(
      defaultRecoveryCurves.muscle(0, [], targetDate, TestRecoveryConfig)
    ).toBe(1);
    expect(
      defaultRecoveryCurves.tendon(1, [], targetDate, TestRecoveryConfig)
    ).toBe(1);
    expect(
      defaultRecoveryCurves.ligament(2, [], targetDate, TestRecoveryConfig)
    ).toBe(1);
  });

  // -------------------------------------------------------
  // Event extraction
  // -------------------------------------------------------
  it("extracts tissue events and sorts them oldest to newest", () => {
    const history = [
      {
        exId: "push",
        date: "2026-02-22",
        tissues: [{ id: "test_tendon", rank: 2 }]
      },
      {
        exId: "push",
        date: "2026-02-20",
        tissues: [{ id: "test_tendon", rank: 1 }]
      },
      {
        exId: "pull",
        date: "2026-02-21",
        tissues: [{ id: "test_muscle", rank: 2 }]
      }
    ];

    const events = getTissueEventsFromHistory("test_tendon", history);

    expect(events.map(e => e.date.toISOString().slice(0, 10))).toEqual([
      "2026-02-20",
      "2026-02-22"
    ]);
    expect(events.map(e => e.rank)).toEqual([1, 2]);
  });

  it("keeps highest same-day tissue rank across exercises", () => {
    const history = [
      {
        exId: "grip",
        date: "2026-03-13",
        tissues: [{ id: "test_muscle", rank: 3 }]
      },
      {
        exId: "utility",
        date: "2026-03-13",
        tissues: [{ id: "test_muscle", rank: 5 }]
      }
    ];

    const events = getTissueEventsFromHistory("test_muscle", history);
    expect(events).toHaveLength(1);
    expect(events[0].rank).toBe(5);
  });

  // -------------------------------------------------------
  // Tissue readiness (proportional model)
  // -------------------------------------------------------
  it("computes tissue readiness using proportional scaling", () => {
    const history = [
      {
        exId: "push",
        date: "2026-02-20",
        tissues: [{ id: "test_tendon", rank: 10 }]
      }
    ];

    // Tendon: baseDays = 1, rank=10/10 => scaledBase=1, total=1*1*1.75=1.75
    // On same day → readiness = 0
    expect(
      computeTissueReadiness(
        "test_tendon",
        "2026-02-20",
        history,
        TestRecoveryConfig
      )
    ).toBe(0);

    // One day later → readiness = 1 / 1.75 ≈ 0.571...
    expect(
      computeTissueReadiness(
        "test_tendon",
        "2026-02-21",
        history,
        TestRecoveryConfig
      )
    ).toBeCloseTo(1 / 1.75, 3);

    // Missing tissue → always ready
    expect(
      computeTissueReadiness(
        "missing_tissue",
        "2026-02-21",
        [],
        TestRecoveryConfig
      )
    ).toBe(1);
  });

  // -------------------------------------------------------
  // Exercise availability
  // -------------------------------------------------------
  it("returns true for unknown exercise ids", () => {
    expect(
      isExerciseAvailableOnDate(
        "does_not_exist",
        "2026-02-21",
        [],
        TestRecoveryConfig
      )
    ).toBe(true);
  });

  it("blocks and then allows an exercise as tissue readiness improves", () => {
    const history = [
      {
        exId: "push",
        date: "2026-02-20",
        tissues: [
          { id: "test_tendon", rank: 3 }, // cooldown = 0.45 days
          { id: "test_ligament", rank: 4 } // cooldown = 1.6 days
        ]
      }
    ];

    // Same day → blocked
    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-20",
        history,
        TestRecoveryConfig
      )
    ).toBe(false);

    // Next day (1 day later):
    // tendon readiness = 1
    // ligament readiness = 1 / 1.6 = 0.625 → still blocked
    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-21",
        history,
        TestRecoveryConfig
      )
    ).toBe(false);

    // Two days later:
    // ligament readiness = 2 / 1.6 = 1.25 → available
    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-22",
        history,
        TestRecoveryConfig
      )
    ).toBe(true);
  });

  it("becomes available exactly at cooldown threshold", () => {
    const history = [
      {
        exId: "push",
        date: "2026-02-20",
        tissues: [{ id: "test_tendon", rank: 10 }]
      }
    ];

    // Tendon total cooldown: 1 * (10/10) * 1.75 = 1.75 days
    // Just before threshold (1.74 days) should still be blocked
    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-21T17:45:36Z",
        history,
        TestRecoveryConfig
      )
    ).toBe(false);

    // Exactly at threshold (1.75 days) should be available
    expect(
      isExerciseAvailableOnDate(
        "push",
        "2026-02-21T18:00:00Z",
        history,
        TestRecoveryConfig
      )
    ).toBe(true);
  });
});
