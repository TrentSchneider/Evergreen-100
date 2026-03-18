// tests/state/recovery.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadStore: vi.fn(),
  todayString: vi.fn(() => "2026-03-05"),
  isExerciseAvailableOnDate: vi.fn(() => true),
  getDaysRemaining: vi.fn(() => 0),
  getBlockedTissues: vi.fn(() => []),
  computeRegionReadiness: vi.fn(() => ({ upper: 1, lower: 1, core: 1 }))
}));

vi.mock("../../src/state/storage.js", () => ({
  loadStore: mocks.loadStore
}));

vi.mock("../../src/utils/dates.js", () => ({
  todayString: mocks.todayString
}));

vi.mock("../../src/recoveryEngine.js", () => ({
  isExerciseAvailableOnDate: mocks.isExerciseAvailableOnDate,
  getDaysRemaining: mocks.getDaysRemaining,
  getBlockedTissues: mocks.getBlockedTissues,
  computeRegionReadiness: mocks.computeRegionReadiness
}));

import {
  isAvailable,
  daysRemaining,
  getBlockedTissues as getStateBlockedTissues,
  getRegionReadiness
} from "../../src/state/recovery.js";
import { EXERCISES } from "../../src/data/config.js";

describe("recovery state module", () => {
  const ex = EXERCISES[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadStore.mockResolvedValue({
      loadStressHistory: callback =>
        callback([
          { exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] },
          { exId: ex.id, date: "2026-03-05", tissues: [{ id: "core", rank: 1 }] }
        ])
    });
  });

  it("returns availability from recovery engine", async () => {
    const result = await isAvailable(ex);

    expect(result).toBe(true);
    expect(mocks.isExerciseAvailableOnDate).toHaveBeenCalledWith(
      ex.id,
      "2026-03-05",
      [{ exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] }],
      expect.any(Object)
    );
  });

  it("returns days remaining from recovery engine", async () => {
    const result = await daysRemaining(ex);

    expect(result).toBe(0);
    expect(mocks.getDaysRemaining).toHaveBeenCalledWith(
      ex.id,
      "2026-03-05",
      [{ exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] }],
      expect.any(Object)
    );
  });

  it("normalizes string ids for blocked tissue lookups", async () => {
    mocks.getBlockedTissues.mockReturnValueOnce([
      { id: "rotator_cuff", daysRemaining: 1 }
    ]);

    const blocked = await getStateBlockedTissues(ex.id);

    expect(blocked).toEqual([{ id: "rotator_cuff", daysRemaining: 1 }]);
    expect(mocks.getBlockedTissues).toHaveBeenCalledWith(
      ex.id,
      "2026-03-05",
      [{ exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] }],
      expect.any(Object)
    );
  });

  it("falls back to loadHistory for region readiness when stress loader is unavailable", async () => {
    mocks.computeRegionReadiness.mockReturnValueOnce({ upper: 0.5, lower: 1 });
    mocks.loadStore.mockResolvedValueOnce({
      loadHistory: callback =>
        callback([
          { exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] },
          { exId: ex.id, date: "2026-03-05", tissues: [{ id: "core", rank: 1 }] }
        ])
    });

    const regions = await getRegionReadiness();

    expect(regions).toEqual({ upper: 0.5, lower: 1 });
    expect(mocks.computeRegionReadiness).toHaveBeenCalledWith(
      "2026-03-05",
      [{ exId: ex.id, date: "2026-03-04", tissues: [{ id: "core", rank: 1 }] }],
      expect.any(Object)
    );
  });
});
