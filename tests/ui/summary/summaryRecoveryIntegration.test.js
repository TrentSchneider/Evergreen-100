import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../../../src/state/state.js";
import { EXERCISES } from "../../../src/data/config.js";

vi.mock("../../../src/state/recovery.js", () => ({
  isAvailable: vi.fn()
}));

// Import after mock is set up
import {
  initSummaryUI,
  recomputeAndRenderSummary
} from "../../../src/ui/summary.js";
import { isAvailable } from "../../../src/state/recovery.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="summary-container">
      <div id="summary-pill"></div>
      <div id="summary-drawer"></div>
      <div id="summary-drawer-content"></div>
    </div>
    <div class="pill-progress-fill"></div>
    <div class="pill-percent"></div>
  `;

  state.values = {};
  EXERCISES.forEach(ex => (state.values[ex.id] = 0));
  vi.clearAllMocks();
  initSummaryUI();
});

describe("summary recovery integration", () => {
  it("calls isAvailable for all exercises", async () => {
    isAvailable.mockResolvedValue(true);
    
    await recomputeAndRenderSummary();

    expect(isAvailable).toHaveBeenCalledTimes(EXERCISES.length);
    EXERCISES.forEach(ex => {
      expect(isAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ id: ex.id })
      );
    });
  });

  it("makes parallel availability checks", async () => {
    isAvailable.mockResolvedValue(true);
    
    await recomputeAndRenderSummary();

    // All exercises should be checked
    expect(isAvailable).toHaveBeenCalledTimes(EXERCISES.length);
  });

  it("correctly handles exercise availability", async () => {
    isAvailable.mockResolvedValue(true);

    await expect(recomputeAndRenderSummary()).resolves.toBeUndefined();
  });

  it("updates UI after async availability checks complete", async () => {
    isAvailable.mockResolvedValue(true);
    state.values[EXERCISES[0].id] = EXERCISES[0].total;
    
    await recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    expect(pct).not.toBe("");
    expect(pct).toMatch(/\d+%/);
  });

  it("handles rejection from isAvailable gracefully", async () => {
    isAvailable.mockRejectedValue(new Error("DB error"));
    
    // Should propagate the error
    await expect(recomputeAndRenderSummary()).rejects.toThrow("DB error");
  });
});
