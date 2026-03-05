import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state } from "../../../src/state/state.js";
import { EXERCISES } from "../../../src/data/config.js";

vi.mock("../../../src/ui/summary.js", () => ({
  recomputeAndRenderSummary: vi.fn(),
  renderHistory: vi.fn()
}));

const saveValueMock = vi.fn();

vi.mock("../../../src/state/storage.js", () => ({
  loadStore: () =>
    Promise.resolve({
      saveValue: saveValueMock
    })
}));

import { wireResetButton } from "../../../src/ui/reset.js";

describe("reset overlay interactions", () => {
  beforeEach(async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <button data-reset="trigger"></button>
      <div data-reset="overlay" class="hidden"></div>
      <button data-reset="cancel"></button>
      <button data-reset="confirm"></button>
    `;

    state.values = Object.fromEntries(EXERCISES.map(ex => [ex.id, 10]));

    await wireResetButton();
  });

  afterEach(() => {
    vi.useRealTimers();
    saveValueMock.mockReset();
  });

  it("hides overlay after cancel", () => {
    const trigger = document.querySelector('[data-reset="trigger"]');
    const overlay = document.querySelector('[data-reset="overlay"]');

    trigger.click();
    expect(overlay.classList.contains("hidden")).toBe(false);

    document.querySelector('[data-reset="cancel"]').click();

    expect(overlay.classList.contains("visible")).toBe(false);
    expect(overlay.classList.contains("hidden")).toBe(false);

    vi.advanceTimersByTime(250);
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  it("shakes trigger and closes after confirm", () => {
    const trigger = document.querySelector('[data-reset="trigger"]');
    const overlay = document.querySelector('[data-reset="overlay"]');

    trigger.click();
    document.querySelector('[data-reset="confirm"]').click();

    expect(trigger.classList.contains("shake")).toBe(true);
    vi.advanceTimersByTime(400);
    expect(trigger.classList.contains("shake")).toBe(false);

    expect(overlay.classList.contains("visible")).toBe(false);
    vi.advanceTimersByTime(250);
    expect(overlay.classList.contains("hidden")).toBe(true);

    expect(saveValueMock).toHaveBeenCalledTimes(EXERCISES.length);
  });
});
