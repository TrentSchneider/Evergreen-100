import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks MUST come before importing the module under test
vi.mock("../../src/state/storage.js", () => ({
  loadStore: () => ({
    saveSettings: vi.fn()
  })
}));

// Define the mock INSIDE the factory to avoid hoist errors
vi.mock("../../src/ui/theme.js", () => ({
  applyTheme: vi.fn()
}));

import { state } from "../../src/state/state.js";
import { wireSettingsCard } from "../../src/ui/settings.js";
import { applyTheme } from "../../src/ui/theme.js";

describe("settings UI", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="settings-card">
        <div class="settings-header">
          <span id="settings-toggle">▼</span>
        </div>
        <div id="settings-body" class="hidden">
          <button class="theme-option" data-theme="dark"></button>
        </div>
      </div>
    `;

    state.settings = {
      theme: "auto",
      layout: { settingsExpanded: false }
    };

    await wireSettingsCard();
  });

  it("toggles settings panel", () => {
    const header = document.querySelector(".settings-header");
    const body = document.getElementById("settings-body");

    header.click();

    expect(body.classList.contains("hidden")).toBe(false);
  });

  it("changes theme", () => {
    const btn = document.querySelector(".theme-option");

    btn.click();

    expect(state.settings.theme).toBe("dark");
    expect(applyTheme).toHaveBeenCalled();
  });
});
