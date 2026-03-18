import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderTiers } from "../../../src/ui/tiers.js";
import { state } from "../../../src/state/state.js";
import { EXERCISES, TIERS } from "../../../src/data/config.js";

const saveSettingsMock = vi.fn();
const saveValueMock = vi.fn((_, __, ___, cb) => cb && cb());

vi.mock("../../../src/state/storage.js", () => ({
  loadStore: () =>
    Promise.resolve({
      saveSettings: saveSettingsMock,
      saveValue: saveValueMock
    })
}));

vi.mock("../../../src/state/recovery.js", () => ({
  isAvailable: () => Promise.resolve(true)
}));

vi.mock("../../../src/ui/summary.js", () => ({
  recomputeAndRenderSummary: vi.fn(),
  renderHistory: vi.fn()
}));

describe("tier header toggles", () => {
  beforeEach(async () => {
    saveSettingsMock.mockReset();
    saveValueMock.mockReset();

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

    TIERS.forEach(tier => {
      state.settings.layout.tierExpanded[tier.id] = false;
    });

    EXERCISES.forEach(ex => {
      state.values[ex.id] = 0;
      state.settings.layout.rowExpanded[ex.id] = false;
    });

    await renderTiers();
  });

  it("expands and collapses tier card", async () => {
    const tier = TIERS[0];
    const header = document.querySelector(
      `.tier-header .tier-toggle[data-tier="${tier.id}"]`
    ).parentElement;
    const body = document.getElementById(`tier-body-${tier.id}`);
    const toggle = document.querySelector(
      `.tier-toggle[data-tier="${tier.id}"]`
    );

    header.click();
    await Promise.resolve();

    expect(state.settings.layout.tierExpanded[tier.id]).toBe(true);
    expect(body.style.maxHeight).toBe("1000px");
    expect(toggle.textContent).toBe("▲");
    expect(saveSettingsMock).toHaveBeenCalledTimes(1);

    header.click();
    await Promise.resolve();

    expect(state.settings.layout.tierExpanded[tier.id]).toBe(false);
    expect(body.style.maxHeight).toBe("0px");
    expect(toggle.textContent).toBe("▼");
    expect(saveSettingsMock).toHaveBeenCalledTimes(2);
  });
});
