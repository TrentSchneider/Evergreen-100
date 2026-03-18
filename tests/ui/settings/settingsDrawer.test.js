import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../../../src/state/state.js";
import { wireSettingsCard } from "../../../src/ui/settings.js";

const saveSettingsMock = vi.fn();

vi.mock("../../../src/state/storage.js", () => ({
  loadStore: () =>
    Promise.resolve({
      saveSettings: saveSettingsMock
    })
}));

describe("settings drawer keyboard toggles", () => {
  beforeEach(async () => {
    saveSettingsMock.mockReset();

    document.body.innerHTML = `
      <div class="settings-card">
        <div class="settings-header" role="button" tabindex="0" aria-expanded="false">
          <div class="settings-title">Settings</div>
          <span id="settings-toggle">▼</span>
        </div>
        <div id="settings-body" class="settings-body" aria-hidden="true">
          <div class="settings-body-inner" style="height: 200px;"></div>
        </div>
      </div>
    `;

    const body = document.getElementById("settings-body");
    Object.defineProperty(body, "scrollHeight", {
      value: 240,
      configurable: true
    });

    state.settings = {
      theme: "auto",
      layout: {
        settingsExpanded: false,
        tierExpanded: {},
        rowExpanded: {}
      }
    };

    await wireSettingsCard();
  });

  it("expands via Enter key", () => {
    const header = document.querySelector(".settings-header");
    const body = document.getElementById("settings-body");
    const toggle = document.getElementById("settings-toggle");

    header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(body.classList.contains("open")).toBe(true);
    expect(body.getAttribute("aria-hidden")).toBe("false");
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("▲");
    expect(body.style.maxHeight).toBe("240px");
    expect(saveSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("collapses via Space key and prevents scroll", () => {
    const header = document.querySelector(".settings-header");
    const body = document.getElementById("settings-body");
    const toggle = document.getElementById("settings-toggle");

    header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const spaceEvent = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true
    });
    header.dispatchEvent(spaceEvent);

    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(body.classList.contains("open")).toBe(false);
    expect(body.getAttribute("aria-hidden")).toBe("true");
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toBe("▼");
    expect(body.style.maxHeight).toBe("0px");
    expect(saveSettingsMock).toHaveBeenCalledTimes(2);
  });
});
