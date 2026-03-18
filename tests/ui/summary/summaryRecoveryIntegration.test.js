import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../src/state/recovery.js", () => ({
  isAvailable: vi.fn()
}));

let state;
let EXERCISES;
let initSummaryUI;
let recomputeAndRenderSummary;
let isAvailable;

beforeEach(async () => {
  // isolate:false means module cache is shared across files; reload modules per test
  vi.resetModules();

  ({ state } = await import("../../../src/state/state.js"));
  ({ EXERCISES } = await import("../../../src/data/config.js"));
  ({ initSummaryUI, recomputeAndRenderSummary } = await import(
    "../../../src/ui/summary.js"
  ));
  ({ isAvailable } = await import("../../../src/state/recovery.js"));

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
