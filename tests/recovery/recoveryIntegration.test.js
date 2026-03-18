import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---------------------------------------------------------
// Mock loadStore so state/recovery doesn't hit IndexedDB
// ---------------------------------------------------------
vi.mock("../../src/state/storage.js", () => ({
  loadStore: () => ({
    loadHistory: cb => cb([]) // state wrapper always sees empty history
  })
}));

// ---------------------------------------------------------
// Import real recovery engine + state wrapper
// ---------------------------------------------------------
import {
  isExerciseAvailableOnDate,
  getDaysRemaining
} from "../../src/recoveryEngine.js";

import { isAvailable, daysRemaining } from "../../src/state/recovery.js";

// ---------------------------------------------------------
// Local test config (proportional model, 1–10 scale)
// ---------------------------------------------------------
const TestRecoveryConfig = {
  recoveryRankMax: 10,
  tissueTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  },
  tissues: [
    { id: "test_tendon", type: "tendon", region: "upper" },
    { id: "test_ligament", type: "ligament", region: "upper" }
  ],
  exercises: {
    tendonOnly: {
      tissues: [{ id: "test_tendon", rank: 3 }]
    },
    ligamentOnly: {
      tissues: [{ id: "test_ligament", rank: 3 }]
    },
    multi: {
      tissues: [
        { id: "test_tendon", rank: 3 },
        { id: "test_ligament", rank: 3 }
      ]
    }
  }
};

describe("Recovery Integration Tests (Proportional Model)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------
  // Tendon-only exercise (rank 3 → 0.45 day cooldown)
  // ---------------------------------------------------------
  it("tendon-only exercise is available next day", () => {
    const history = [
      {
        exId: "tendonOnly",
        date: "2024-01-01",
        tissues: [{ id: "test_tendon", rank: 3 }]
      }
    ];

    // Same day → blocked
    expect(
      isExerciseAvailableOnDate(
        "tendonOnly",
        "2024-01-01",
        history,
        TestRecoveryConfig
      )
    ).toBe(false);

    // Next day → fully recovered (0.45 days cooldown)
    vi.setSystemTime(new Date("2024-01-02T12:00:00Z"));
    const dayTwo = new Date().toISOString().slice(0, 10);

    expect(
      isExerciseAvailableOnDate(
        "tendonOnly",
        dayTwo,
        history,
        TestRecoveryConfig
      )
    ).toBe(true);
  });

  // ---------------------------------------------------------
  // Ligament-only exercise (rank 3 → 1.2 day cooldown)
  // ---------------------------------------------------------
  it("ligament-only exercise is still blocked next day", () => {
    const history = [
      {
        exId: "ligamentOnly",
        date: "2024-01-01",
        tissues: [{ id: "test_ligament", rank: 3 }]
      }
    ];

    // Next day → readiness = 1 / 1.2 = 0.83 → still blocked
    vi.setSystemTime(new Date("2024-01-02T12:00:00Z"));
    const dayTwo = new Date().toISOString().slice(0, 10);

    expect(
      isExerciseAvailableOnDate(
        "ligamentOnly",
        dayTwo,
        history,
        TestRecoveryConfig
      )
    ).toBe(false);
  });

  it("ligament-only exercise becomes available two days later", () => {
    const history = [
      {
        exId: "ligamentOnly",
        date: "2024-01-01",
        tissues: [{ id: "test_ligament", rank: 3 }]
      }
    ];

    // Two days later → readiness = 2 / 1.2 = 1.66 → available
    vi.setSystemTime(new Date("2024-01-03T12:00:00Z"));
    const dayThree = new Date().toISOString().slice(0, 10);

    expect(
      isExerciseAvailableOnDate(
        "ligamentOnly",
        dayThree,
        history,
        TestRecoveryConfig
      )
    ).toBe(true);
  });

  // ---------------------------------------------------------
  // Multi-tissue exercise (tendon + ligament)
  // ---------------------------------------------------------
  it("multi-tissue exercise is blocked next day due to ligament", () => {
    const history = [
      {
        exId: "multi",
        date: "2024-01-01",
        tissues: [
          { id: "test_tendon", rank: 3 },
          { id: "test_ligament", rank: 3 }
        ]
      }
    ];

    vi.setSystemTime(new Date("2024-01-02T12:00:00Z"));
    const dayTwo = new Date().toISOString().slice(0, 10);

    expect(
      isExerciseAvailableOnDate("multi", dayTwo, history, TestRecoveryConfig)
    ).toBe(false);
  });

  it("multi-tissue exercise becomes available two days later", () => {
    const history = [
      {
        exId: "multi",
        date: "2024-01-01",
        tissues: [
          { id: "test_tendon", rank: 3 },
          { id: "test_ligament", rank: 3 }
        ]
      }
    ];

    vi.setSystemTime(new Date("2024-01-03T12:00:00Z"));
    const dayThree = new Date().toISOString().slice(0, 10);

    expect(
      isExerciseAvailableOnDate("multi", dayThree, history, TestRecoveryConfig)
    ).toBe(true);
  });

  // ---------------------------------------------------------
  // State wrapper behavior
  // ---------------------------------------------------------
  it("state wrapper always reports available with empty mocked history", async () => {
    const stateExercise = { id: "tendonOnly" };

    const stateAvailable = await isAvailable(stateExercise);

    expect(stateAvailable).toBe(true);
  });
});
