import { state, setSettingsExpanded, setTheme } from "../state/state.js";
import { loadStore } from "../state/storage.js";
import { applyTheme } from "./theme.js";

// ---------------------------------------------------------
// Wire Settings Card
// ---------------------------------------------------------

export async function wireSettingsCard() {
  const { saveSettings } = await loadStore();

  const settingsHeader = document.querySelector(".settings-header");
  const settingsBody = document.getElementById("settings-body");
  const settingsToggle = document.getElementById("settings-toggle");

  if (!settingsHeader || !settingsBody || !settingsToggle) return;

  // Initial state
  if (state.settings.layout.settingsExpanded) {
    settingsBody.classList.remove("hidden");
    settingsToggle.textContent = "▲";
  } else {
    settingsBody.classList.add("hidden");
    settingsToggle.textContent = "▼";
  }

  // Expand / collapse
  settingsHeader.addEventListener("click", () => {
    const expanded = !state.settings.layout.settingsExpanded;

    setSettingsExpanded(expanded);
    saveSettings(state);

    if (expanded) {
      settingsBody.classList.remove("hidden");
      settingsToggle.textContent = "▲";
    } else {
      settingsBody.classList.add("hidden");
      settingsToggle.textContent = "▼";
    }
  });

  // Theme selection buttons
  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.theme;

      setTheme(mode);
      saveSettings(state);
      applyTheme();
    });
  });
}
