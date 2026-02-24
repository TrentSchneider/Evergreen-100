import { EXERCISES } from "../data/config.js";
import { state, setExerciseValue } from "../state/state.js";
import { loadStore } from "../state/storage.js";
import { todayString } from "../utils/dates.js";
import { recomputeAndRenderSummary, renderHistory } from "./summary.js";
import { formatValue, formatTotal, remaining, completionClass } from "../utils/formatting.js";

// ---------------------------------------------------------
// Wire Reset Button & Overlay
// ---------------------------------------------------------

export async function wireResetButton() {
  const { saveValue } = await loadStore();

  const trigger = document.querySelector('[data-reset="trigger"]');
  const overlay = document.querySelector('[data-reset="overlay"]');
  const cancelBtn = document.querySelector('[data-reset="cancel"]');
  const confirmBtn = document.querySelector('[data-reset="confirm"]');

  if (!trigger || !overlay || !cancelBtn || !confirmBtn) return;

  // Open overlay
  trigger.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
  });

  // Cancel overlay
  cancelBtn.addEventListener("click", () => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });

  // Confirm reset
  confirmBtn.addEventListener("click", () => {
    // Shake animation on trigger
    const t = document.querySelector('[data-reset="trigger"]');
    if (t) {
      t.classList.add("shake");
      setTimeout(() => t.classList.remove("shake"), 400);
    }

    // Reset all exercise values
    EXERCISES.forEach(ex => {
      setExerciseValue(ex.id, 0);
      saveValue(ex.id, 0, todayString);
      updateRowUI(ex);
    });

    // Re-render summary + history
    recomputeAndRenderSummary();
    renderHistory();

    // Close overlay
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });
}

// ---------------------------------------------------------
// Update Row UI (duplicate kept local for reset behavior)
// ---------------------------------------------------------

function updateRowUI(ex) {
  const value = state.values[ex.id] || 0;

  const compactEl = document.getElementById(`compact-${ex.id}`);
  if (compactEl) {
    compactEl.textContent = `${formatValue(ex, value)} / ${formatTotal(ex)}`;
  }

  const remainingEl = document.getElementById(`remaining-${ex.id}`);
  if (remainingEl) {
    remainingEl.textContent = remaining(ex, value);
  }

  const rowEl = document.getElementById(`row-${ex.id}`);
  if (rowEl) {
    rowEl.className = `exercise-row ${completionClass(ex, value)}`;
  }

  const inputEl = document.getElementById(`input-${ex.id}`);
  if (inputEl) {
    inputEl.value = formatValue(ex, value);
  }
}
