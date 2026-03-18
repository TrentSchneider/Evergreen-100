import { initDb, loadStore } from "./state/storage.js";
import {
  state,
  setLastLogDate,
  incrementStreak,
  resetStreak,
  setAllExerciseValues
} from "./state/state.js";
import { EXERCISES, TIERS, EvergreenConfig } from "./data/config.js";
import { todayString } from "./utils/dates.js";
import { computeGlobalPercent } from "./state/completion.js";

import { applyTheme } from "./ui/theme.js";
import {
  initSummaryUI,
  recomputeAndRenderSummary,
  renderHistory
} from "./ui/summary.js";
import { renderTiers } from "./ui/tiers.js";
import { wireSettingsCard } from "./ui/settings.js";
import { wireResetButton } from "./ui/reset.js";
import { initScrollShadows } from "./ui/scrollShadows.js";

// ---------------------------------------------------------
// Render All (Main App Logic)
// ---------------------------------------------------------

async function renderAll() {
  const { getAllValues, loadSettings, saveSettings, snapshotDay, saveValue } =
    await loadStore();

  // Load exercise values
  const values = await getAllValues(EXERCISES);
  setAllExerciseValues(values);

  // Load settings (layout, theme, streak, etc.)
  loadSettings(state, TIERS, async () => {
    const today = todayString();
    const last = state.settings.lastLogDate;

    // First-ever run
    if (!last) {
      setLastLogDate(today);
      await saveSettings(state);
    }

    // New day → snapshot yesterday, reset values, update streak
    else if (last !== today) {
      await snapshotDay(
        last,
        state.values,
        computeGlobalPercent,
        EvergreenConfig,
        async completion => {
          if (completion >= 100) {
            incrementStreak();
          } else {
            resetStreak();
          }

          // Reset all exercise values
          for (const { id: exerciseId } of EXERCISES) {
            state.values[exerciseId] = 0;
            await saveValue(exerciseId, 0, todayString);
          }

          setLastLogDate(today);
          await saveSettings(state);

          // Re-render everything
          applyTheme();
          renderTiers();
          wireSettingsCard();
          wireResetButton();
          await recomputeAndRenderSummary();
          renderHistory();
        }
      );

      return;
    }

    // Same day → normal render
    applyTheme();
    renderTiers();
    wireSettingsCard();
    wireResetButton();
    await recomputeAndRenderSummary();
    renderHistory();
  });
}

// ---------------------------------------------------------
// App Initialization
// ---------------------------------------------------------

window.addEventListener("DOMContentLoaded", async () => {
  await initDb();

  // Ensure DB is fully opened AND seeded before UI logic runs
  const { openDb } = await import("./db/openDb.js");
  await openDb();

  // Initialize UI subsystems
  initSummaryUI();
  initScrollShadows();

  // Render everything
  renderAll();
});