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

import { EXERCISES } from "../../src/data/config.js";

// ---------------------------------------------------------
// Local test config (same shape as real config)
// ---------------------------------------------------------
const TestRecoveryConfig = {
  recoveryRankMax: 5,
  recoveryTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  }
};

describe("Recovery Integration Tests", () => {
  const ex = EXERCISES[0];
  const exId = ex.id;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exercise is available on the first day", async () => {
    const today = "2024-01-01";

    const engineAvailable = isExerciseAvailableOnDate(
      exId,
      today,
      [], // no history
      TestRecoveryConfig
    );

    const stateAvailable = await isAvailable(ex);

    expect(engineAvailable).toBe(true);
    expect(stateAvailable).toBe(true);
  });

  it("exercise becomes unavailable after exceeding threshold", () => {
    const today = "2024-01-01";

    const history = [{ exId, type: "tendon", rank: 3, date: "2024-01-01" }];

    const remaining = getDaysRemaining(
      exId,
      today,
      history,
      TestRecoveryConfig
    );

    expect(remaining).toBeGreaterThan(0);
  });

  it("exercise becomes available again after recovery days pass", () => {
    const today = "2024-01-01";

    const history = [{ exId, type: "tendon", rank: 3, date: "2024-01-01" }];

    const days = getDaysRemaining(exId, today, history, TestRecoveryConfig);

    // advance time by cooldown days
    vi.setSystemTime(
      new Date("2024-01-01T12:00:00Z").getTime() + days * 86400000
    );

    const newDate = new Date().toISOString().slice(0, 10);

    const available = isExerciseAvailableOnDate(
      exId,
      newDate,
      history,
      TestRecoveryConfig
    );

    expect(available).toBe(true);
  });

  it("state wrapper returns correct daysRemaining", async () => {
    const today = "2024-01-01";

    const history = [{ exId, type: "tendon", rank: 3, date: "2024-01-01" }];

    const engineDays = getDaysRemaining(
      exId,
      today,
      history,
      TestRecoveryConfig
    );

    const stateDays = await daysRemaining(ex);

    // state wrapper always sees empty history (mocked)
    expect(stateDays).toBe(0);

    // engine sees real history
    expect(engineDays).toBeGreaterThan(0);
  });
});
