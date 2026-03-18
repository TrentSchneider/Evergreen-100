import { describe, it, expect, beforeEach, vi } from "vitest";

const { saveSettingsMock, saveValueMock, isAvailableMock, loadStoreMock } = vi.hoisted(() => {
  const saveSettings = vi.fn();
  const saveValue = vi.fn((_, __, ___, cb) => cb && cb());
  const isAvailable = vi.fn(() => Promise.resolve(true));
  const loadStore = vi.fn(() =>
    Promise.resolve({
      saveSettings,
      saveValue
    })
  );

  return {
    saveSettingsMock: saveSettings,
    saveValueMock: saveValue,
    isAvailableMock: isAvailable,
    loadStoreMock: loadStore
  };
});

vi.mock("../../../src/state/storage.js", () => ({
  loadStore: loadStoreMock
}));

vi.mock("../../../src/state/recovery.js", () => ({
  isAvailable: (...args) => isAvailableMock(...args)
}));

vi.mock("../../../src/ui/summary.js", () => ({
  recomputeAndRenderSummary: vi.fn(),
  renderHistory: vi.fn()
}));

import { renderTiers } from "../../../src/ui/tiers.js";
import { state } from "../../../src/state/state.js";
import { EXERCISES, TIERS } from "../../../src/data/config.js";

const exercise = EXERCISES[0];
const timeExercise = EXERCISES.find(ex => ex.type === "time");
const tier = TIERS.find(t => t.id === exercise.tier);

const waitForUpdates = () => new Promise(resolve => setTimeout(resolve, 0));

describe("tier row controls", () => {
  beforeEach(async () => {
    saveSettingsMock.mockReset();
    saveValueMock.mockReset();
    saveValueMock.mockImplementation((_, __, ___, cb) => cb && cb());
    isAvailableMock.mockReset();
    isAvailableMock.mockImplementation(() => Promise.resolve(true));
    loadStoreMock.mockReset();
    loadStoreMock.mockImplementation(() =>
      Promise.resolve({
        saveSettings: saveSettingsMock,
        saveValue: saveValueMock
      })
    );

    document.body.innerHTML = `<div id="tiers-container"></div>`;

    state.values = {};
    state.settings = {
      theme: "auto",
      layout: {
        settingsExpanded: false,
        tierExpanded: {},
        rowExpanded: {}
      }
    };

    TIERS.forEach(t => {
      state.settings.layout.tierExpanded[t.id] = t.id === tier.id;
    });

    EXERCISES.forEach(ex => {
      if (ex.id === exercise.id) {
        state.values[ex.id] = 2;
      } else if (ex.id === timeExercise.id) {
        state.values[ex.id] = 65;
      } else {
        state.values[ex.id] = 0;
      }
      state.settings.layout.rowExpanded[ex.id] = ex.id === exercise.id;
    });

    await renderTiers();
    await Promise.resolve();
    await Promise.resolve();
    await waitForUpdates();
  });

  it("increments values via arrow controls", async () => {
    const incBtn = document.getElementById(`inc-${exercise.id}`);
    const compact = document.getElementById(`compact-${exercise.id}`);

    incBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await waitForUpdates();

    expect(state.values[exercise.id]).toBe(3);
    expect(compact.textContent.trim().startsWith("3")).toBe(true);
    expect(saveValueMock).toHaveBeenCalled();
  });

  it("persists manual input when save is clicked", async () => {
    const input = document.getElementById(`input-${exercise.id}`);
    const saveBtn = document.getElementById(`save-${exercise.id}`);

    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(saveBtn.style.display).toBe("inline-flex");

    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await waitForUpdates();

    expect(state.values[exercise.id]).toBe(10);
    expect(saveValueMock).toHaveBeenCalled();
    expect(saveBtn.style.display).toBe("none");
  });

  it("skips adjustments when recovery is unavailable", async () => {
    const incBtn = document.getElementById(`inc-${exercise.id}`);
    isAvailableMock.mockImplementationOnce(() => Promise.resolve(false));

    incBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(state.values[exercise.id]).toBe(2);
    expect(saveValueMock).not.toHaveBeenCalled();
  });

  it("renders mobile numeric hints on count and time inputs", () => {
    const countInput = document.getElementById(`input-${exercise.id}`);
    const timeInput = document.getElementById(`input-${timeExercise.id}`);

    expect(countInput.getAttribute("inputmode")).toBe("numeric");
    expect(countInput.getAttribute("pattern")).toBe("[0-9]*");
    expect(timeInput.getAttribute("inputmode")).toBe("numeric");
    expect(timeInput.getAttribute("pattern")).toBe("[0-9:]*");
  });

  it("keeps time colon locked while allowing digit edits", async () => {
    const input = document.getElementById(`input-${timeExercise.id}`);
    const saveBtn = document.getElementById(`save-${timeExercise.id}`);

    expect(input.value).toBe("1:05");

    input.setSelectionRange(2, 2);
    const keydown = new KeyboardEvent("keydown", {
      key: "Backspace",
      bubbles: true,
      cancelable: true
    });
    input.dispatchEvent(keydown);
    expect(keydown.defaultPrevented).toBe(true);

    input.value = "930";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(input.value).toBe("9:30");
    expect(saveBtn.style.display).toBe("inline-flex");

    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await waitForUpdates();

    expect(state.values[timeExercise.id]).toBe(570);
    expect(saveBtn.style.display).toBe("none");
  });
});
