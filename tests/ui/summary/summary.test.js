import { describe, it, expect, beforeEach } from "vitest";
import { initSummaryUI, recomputeAndRenderSummary } from "../../../src/ui/summary.js";
import { state } from "../../../src/state/state.js";
import { EXERCISES } from "../../../src/data/config.js";

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
});

describe("summary UI", () => {
  it("initializes without errors", () => {
    expect(() => initSummaryUI()).not.toThrow();
  });

  it("updates percent display", () => {
    initSummaryUI();
    recomputeAndRenderSummary();

    const pct = document.querySelector(".pill-percent").textContent;
    expect(pct).toBe("0%");
  });
});
