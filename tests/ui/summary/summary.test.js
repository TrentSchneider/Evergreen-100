import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the recovery state module
vi.mock("../../../src/state/recovery.js", () => ({
  isAvailable: vi.fn()
}));

let initSummaryUI;
let recomputeAndRenderSummary;
let state;
let EXERCISES;
let isAvailable;

beforeEach(async () => {
  // isolate:false means module cache is shared across files; reload modules per test
  vi.resetModules();

  ({ initSummaryUI, recomputeAndRenderSummary } = await import(
    "../../../src/ui/summary.js"
  ));
  ({ state } = await import("../../../src/state/state.js"));
  ({ EXERCISES } = await import("../../../src/data/config.js"));
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
});

describe("summary UI", () => {
  it("initializes without errors", () => {
    expect(() => initSummaryUI()).not.toThrow();
  });

  it("updates percent display when all exercises are available", async () => {
    initSummaryUI();
    
    // Mock all exercises as available
    isAvailable.mockResolvedValue(true);
    
    await recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    expect(pct).toBe("0%");
  });

  it("excludes recovering exercises from global completion percentage", async () => {
    initSummaryUI();
    
    // Initialize all exercises to 0
    EXERCISES.forEach(ex => {
      state.values[ex.id] = 0;
    });
    
    // Complete only the first available exercise
    state.values[EXERCISES[0].id] = EXERCISES[0].total; // 100%
    
    // First exercise is available, all others are recovering
    isAvailable.mockImplementation(async (ex) => {
      return ex.id === EXERCISES[0].id;
    });
    
    await recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    const percentValue = parseInt(pct);
    
    // Should be 100% (only first exercise counts, and it's complete)
    expect(percentValue).toBe(100);
  });

  it("shows individual exercise progress for both available and recovering exercises", async () => {
    initSummaryUI();
    
    const allExercises = EXERCISES.map((ex, idx) => ex);
    state.values[allExercises[0].id] = allExercises[0].total;
    state.values[allExercises[1].id] = allExercises[1].total / 2;
    
    // First is available, second is recovering
    isAvailable.mockImplementation(async (ex) => {
      return ex.id !== allExercises[1].id;
    });
    
    await recomputeAndRenderSummary();

    const drawerContent = document.getElementById("summary-drawer-content");
    const summaryRows = drawerContent.querySelectorAll(".summary-row");
    
    // All exercises should still be shown in drawer
    expect(summaryRows.length).toBe(allExercises.length);
  });

  it("sets global percent to 0 when all exercises are recovering", async () => {
    initSummaryUI();
    
    // Set all exercises to completed
    EXERCISES.forEach(ex => {
      state.values[ex.id] = ex.total;
    });
    
    // But all are recovering
    isAvailable.mockResolvedValue(false);
    
    await recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    expect(pct).toBe("0%");
  });

  it("handles mixed availability - some available, some recovering", async () => {
    initSummaryUI();
    
    const allExercises = EXERCISES.map((ex, idx) => ex);
    
    // Complete first exercise
    state.values[allExercises[0].id] = allExercises[0].total;
    // Half-complete other exercises
    allExercises.slice(1).forEach(ex => {
      state.values[ex.id] = ex.total / 2;
    });
    
    // First is available, others are recovering
    isAvailable.mockImplementation(async (ex) => {
      return ex.id === allExercises[0].id;
    });
    
    await recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    const percentValue = parseInt(pct);
    
    // Only first exercise counts at 100%
    expect(percentValue).toBe(100);
  });
});
