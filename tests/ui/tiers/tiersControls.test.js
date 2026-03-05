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
      state.values[ex.id] = ex.id === exercise.id ? 2 : 0;
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
});
