import { state, setSettingsExpanded, setTheme } from "../state/state.js";
import { loadStore } from "../state/storage.js";
import { applyTheme } from "./theme.js";

let settingsCleanup = null;

// ---------------------------------------------------------
// Wire Settings Card
// ---------------------------------------------------------

export async function wireSettingsCard() {
  if (settingsCleanup) {
    settingsCleanup();
    settingsCleanup = null;
  }

  const { saveSettings } = await loadStore();

  const settingsHeader = document.querySelector(".settings-header");
  const settingsBody = document.getElementById("settings-body");
  const settingsToggle = document.getElementById("settings-toggle");

  if (!settingsHeader || !settingsBody || !settingsToggle) return;

  const applyDrawerState = expanded => {
    if (expanded) {
      settingsBody.classList.add("open");
      settingsBody.setAttribute("aria-hidden", "false");
      settingsHeader.setAttribute("aria-expanded", "true");
      settingsToggle.textContent = "▲";
      settingsBody.style.maxHeight = `${settingsBody.scrollHeight}px`;
    } else {
      settingsBody.classList.remove("open");
      settingsBody.setAttribute("aria-hidden", "true");
      settingsHeader.setAttribute("aria-expanded", "false");
      settingsToggle.textContent = "▼";
      settingsBody.style.maxHeight = "0px";
    }
  };

  applyDrawerState(state.settings.layout.settingsExpanded);

  const toggleDrawer = () => {
    const expanded = !state.settings.layout.settingsExpanded;

    setSettingsExpanded(expanded);
    saveSettings(state);
    applyDrawerState(expanded);
  };

  const onHeaderKeydown = event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDrawer();
    }
  };

  settingsHeader.addEventListener("click", toggleDrawer);

  settingsHeader.addEventListener("keydown", onHeaderKeydown);

  // Theme selection buttons
  const themeButtons = Array.from(document.querySelectorAll(".theme-option"));
  const onThemeClick = event => {
    const mode = event.currentTarget.dataset.theme;

    setTheme(mode);
    saveSettings(state);
    applyTheme();
  };

  themeButtons.forEach(btn => {
    btn.addEventListener("click", onThemeClick);
  });

  settingsCleanup = () => {
    settingsHeader.removeEventListener("click", toggleDrawer);
    settingsHeader.removeEventListener("keydown", onHeaderKeydown);
    themeButtons.forEach(btn => {
      btn.removeEventListener("click", onThemeClick);
    });
  };
}
