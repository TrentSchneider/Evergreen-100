import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../../../src/state/state.js";
import { EXERCISES } from "../../../src/data/config.js";
import { wireResetButton } from "../../../src/ui/reset.js";

// Mock summary + history so reset doesn't touch missing DOM nodes
vi.mock("../../../src/ui/summary.js", () => ({
  recomputeAndRenderSummary: vi.fn(),
  renderHistory: vi.fn()
}));

describe("reset UI", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <button data-reset="trigger"></button>
      <div data-reset="overlay" class="hidden"></div>
      <button data-reset="cancel"></button>
      <button data-reset="confirm"></button>
    `;

    state.values = Object.fromEntries(EXERCISES.map(ex => [ex.id, 10]));

    await wireResetButton();
  });

  it("opens overlay", () => {
    document.querySelector('[data-reset="trigger"]').click();
    const overlay = document.querySelector('[data-reset="overlay"]');
    expect(overlay.classList.contains("hidden")).toBe(false);
  });

  it("resets all values", async () => {
    document.querySelector('[data-reset="confirm"]').click();

    await Promise.resolve();
    await Promise.resolve();

    EXERCISES.forEach(ex => {
      expect(state.values[ex.id]).toBe(0);
    });
  });
});
