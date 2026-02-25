// tests/state/recovery.test.js
import { describe, it, expect, vi } from "vitest";

// Mock recoveryEngine
vi.mock("../../src/recoveryEngine.js", () => ({
  isExerciseAvailableOnDate: vi.fn((ex, date) => true),
  getDaysRemaining: vi.fn(() => 0)
}));

import { isAvailable, daysRemaining } from "../../src/state/recovery.js";
import { EXERCISES } from "../../src/data/config.js";

describe("recovery state module", () => {
  const ex = EXERCISES[0];

  it("returns availability from recovery engine", async () => {
    const result = await isAvailable(ex);
    expect(result).toBe(true);
  });

  it("returns days remaining from recovery engine", async () => {
    const result = await daysRemaining(ex);
    expect(result).toBe(0);
  });
});
