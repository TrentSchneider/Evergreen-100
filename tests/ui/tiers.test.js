import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../../src/state/state.js";
import { EXERCISES, TIERS } from "../../src/data/config.js";

// Mock storage
vi.mock("../../src/state/storage.js", () => ({
  loadStore: () => ({
    saveSettings: vi.fn(),
    saveValue: vi.fn()
  })
}));

// Mock recovery
vi.mock("../../src/state/recovery.js", () => ({
  isAvailable: () => Promise.resolve(true)
}));

import { renderTiers } from "../../src/ui/tiers.js";

describe("tiers UI", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="tiers-container"></div>
    `;

    state.settings = {
      layout: {
        tierExpanded: {},
        rowExpanded: {}
      }
    };

    // Expand all tiers so rows are clickable
    TIERS.forEach(tier => {
      state.settings.layout.tierExpanded[tier.id] = true;
    });

    // Initialize rowExpanded for all exercises
    EXERCISES.forEach(ex => {
      state.settings.layout.rowExpanded[ex.id] = false;
    });

    await renderTiers();
  });

  it("expands and collapses rows", async () => {
    const compact = document.querySelector(".compact-row");
    const expanded = document.querySelector(".expanded-row");

    expect(expanded.style.display).toBe("none");

    compact.click();
    await Promise.resolve();
    expect(expanded.style.display).toBe("block");

    compact.click();
    await Promise.resolve();
    expect(expanded.style.display).toBe("none");
  });
});
