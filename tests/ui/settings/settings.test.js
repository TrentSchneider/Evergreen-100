import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";

// Mocks MUST come before importing the module under test
vi.mock("../../../src/state/storage.js", () => ({
  loadStore: () => ({
    saveSettings: vi.fn()
  })
}));

// Define the mock INSIDE the factory to avoid hoist errors
vi.mock("../../../src/ui/theme.js", () => ({
  applyTheme: vi.fn()
}));

let appState;
let wireSettingsCard;
let applyTheme;

beforeAll(async () => {
  vi.resetModules();
  ({ state: appState } = await import("../../../src/state/state.js"));
  ({ wireSettingsCard } = await import("../../../src/ui/settings.js"));
  ({ applyTheme } = await import("../../../src/ui/theme.js"));
});

describe("settings UI", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="settings-card">
        <div class="settings-header" role="button" tabindex="0" aria-expanded="false">
          <div class="settings-title">Settings</div>
          <span id="settings-toggle">▼</span>
        </div>
        <div id="settings-body" class="settings-body" aria-hidden="true">
          <div class="settings-body-inner">
            <div class="setting-section">
              <div class="setting-section-content">
                <button class="theme-option" data-theme="dark"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    appState.settings = {
      theme: "auto",
      layout: { settingsExpanded: false }
    };

    await wireSettingsCard();
  });

  it("toggles settings panel", () => {
    const header = document.querySelector(".settings-header");
    const body = document.getElementById("settings-body");

    header.click();

    expect(body.classList.contains("open")).toBe(true);
    expect(body.getAttribute("aria-hidden")).toBe("false");
  });

  it("keeps drawer open when interacting inside", () => {
    const header = document.querySelector(".settings-header");
    const body = document.getElementById("settings-body");
    const sectionContent = document.querySelector(".setting-section-content");

    header.click();
    sectionContent.click();

    expect(body.classList.contains("open")).toBe(true);
  });

  it("changes theme", () => {
    const btn = document.querySelector(".theme-option");

    btn.click();

    expect(appState.settings.theme).toBe("dark");
    expect(applyTheme).toHaveBeenCalled();
  });
});
