import { EXERCISES, TIERS, EvergreenConfig } from "../data/config.js";
import { state, setRowExpanded, setTierExpanded } from "../state/state.js";
import { loadStore } from "../state/storage.js";
import { isAvailable } from "../state/recovery.js";
import {
  formatValue,
  parseValue,
  formatTotal,
  remaining,
  completionClass
} from "../utils/formatting.js";
import { todayString } from "../utils/dates.js";
import { recomputeAndRenderSummary } from "./summary.js";
import { renderHistory } from "./summary.js";

function normalizeTimeInput(text) {
  const digitsOnly = String(text || "").replace(/\D/g, "");
  if (!digitsOnly) return "0:00";

  const rawMinutes = digitsOnly.length > 2 ? digitsOnly.slice(0, -2) : "0";
  const rawSeconds = digitsOnly.slice(-2).padStart(2, "0");

  const minutes = Number(rawMinutes);
  return `${Number.isFinite(minutes) ? minutes : 0}:${rawSeconds}`;
}

function selectionTouchesColon(inputEl) {
  const colonIndex = inputEl.value.indexOf(":");
  if (colonIndex === -1) return false;

  const start = inputEl.selectionStart ?? 0;
  const end = inputEl.selectionEnd ?? start;
  return start <= colonIndex && end > colonIndex;
}

function isSingleCaretColonDelete(inputEl, key) {
  const colonIndex = inputEl.value.indexOf(":");
  if (colonIndex === -1) return false;

  const start = inputEl.selectionStart ?? 0;
  const end = inputEl.selectionEnd ?? start;
  if (start !== end) return false;

  if (key === "Backspace") return start === colonIndex + 1;
  if (key === "Delete") return start === colonIndex;
  return false;
}

// ---------------------------------------------------------
// Render All Tiers & Rows
// ---------------------------------------------------------

export function renderTiers() {
  const container = document.getElementById("tiers-container");
  if (!container) return;

  container.innerHTML = "";

  TIERS.forEach(tier => {
    const tierCard = document.createElement("div");
    tierCard.className = "card tier-card";

    // -----------------------------
    // Tier Header
    // -----------------------------
    const header = document.createElement("div");
    header.className = "tier-header";
    header.innerHTML = `
      <span>${tier.name}</span>
      <span class="tier-toggle" data-tier="${tier.id}">
        ${state.settings.layout.tierExpanded[tier.id] ? "▲" : "▼"}
      </span>
    `;
    header.addEventListener("click", () => toggleTier(tier.id));
    tierCard.appendChild(header);

    // -----------------------------
    // Tier Body
    // -----------------------------
    const tierBody = document.createElement("div");
    tierBody.id = `tier-body-${tier.id}`;
    tierBody.style.overflow = "hidden";
    tierBody.style.maxHeight = state.settings.layout.tierExpanded[tier.id]
      ? "1000px"
      : "0px";
    tierBody.style.transition = "max-height 0.3s ease";

    // -----------------------------
    // Exercise Rows
    // -----------------------------
    EXERCISES.filter(ex => ex.tier === tier.id).forEach(ex => {
      const row = document.createElement("div");
      row.className = "exercise-row loading";
      row.id = `row-${ex.id}`;

      // Compact Row
      const compact = document.createElement("div");
      compact.className = "compact-row";
      compact.innerHTML = `
        <div>${ex.name}</div>
        <div id="compact-${ex.id}">
          ${formatValue(ex, state.values[ex.id] || 0)} / ${formatTotal(ex)}
        </div>
      `;
      compact.addEventListener("click", () => toggleRowExpanded(ex.id));
      attachSwipe(compact, ex);

      // Expanded Row
      const expanded = document.createElement("div");
      expanded.className = "expanded-row";
      expanded.id = `expanded-${ex.id}`;
      expanded.style.display = state.settings.layout.rowExpanded[ex.id]
        ? "block"
        : "none";

      const saveIcon = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H3v5.5A1.5 1.5 0 0 0 4.5 7h7A1.5 1.5 0 0 0 13 5.5V0h.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5H14v-5.5A1.5 1.5 0 0 0 12.5 9h-9A1.5 1.5 0 0 0 2 10.5V16h-.5A1.5 1.5 0 0 1 0 14.5z"/>
          <path d="M3 16h10v-5.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5zm9-16H4v5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5zM9 1h2v4H9z"/>
        </svg>
      `;

      const inputAttributes =
        ex.type === "time"
          ? 'type="text" inputmode="numeric" pattern="[0-9:]*"'
          : 'type="text" inputmode="numeric" pattern="[0-9]*"';

      expanded.innerHTML = `
        <div class="controls">
          <button id="save-${ex.id}" class="save-btn no-zoom">${saveIcon}</button>
          <input id="input-${ex.id}" ${inputAttributes} />
          <button class="arrow-btn no-zoom" id="inc-${ex.id}">▲</button>
          <button class="arrow-btn no-zoom" id="dec-${ex.id}">▼</button>
        </div>
        <div class="expanded-row-footer">
          <span id="remaining-${ex.id}"></span>
        </div>
      `;

      row.appendChild(compact);
      row.appendChild(expanded);
      tierBody.appendChild(row);

      // -----------------------------
      // Recovery Availability (async)
      // -----------------------------
      setTimeout(async () => {
        const available = await isAvailable(ex);
        const value = state.values[ex.id] || 0;

        row.classList.remove("loading");

        if (!available) {
          row.classList.add("resting");
        } else {
          row.classList.remove("resting");
        }

        row.classList.add(completionClass(ex, value));
      }, 0);
    });

    tierCard.appendChild(tierBody);
    container.appendChild(tierCard);
  });

  wireRowControls();
}

// ---------------------------------------------------------
// Toggle Tier Expanded
// ---------------------------------------------------------

async function toggleTier(tierId) {
  const { saveSettings } = await loadStore();

  const expanded = !state.settings.layout.tierExpanded[tierId];
  setTierExpanded(tierId, expanded);

  saveSettings(state);

  const body = document.getElementById(`tier-body-${tierId}`);
  if (body) {
    body.style.maxHeight = expanded ? "1000px" : "0px";
  }

  const toggle = document.querySelector(`.tier-toggle[data-tier="${tierId}"]`);
  if (toggle) {
    toggle.textContent = expanded ? "▲" : "▼";
  }
}

// ---------------------------------------------------------
// Toggle Row Expanded
// ---------------------------------------------------------

async function toggleRowExpanded(id) {
  const { saveSettings } = await loadStore();

  const expanded = !state.settings.layout.rowExpanded[id];
  setRowExpanded(id, expanded);

  saveSettings(state);

  const el = document.getElementById(`expanded-${id}`);
  if (el) {
    el.style.display = expanded ? "block" : "none";
  }
}

// ---------------------------------------------------------
// Swipe Gestures
// ---------------------------------------------------------

function attachSwipe(element, ex) {
  let startX = 0;

  element.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].clientX;
  });

  element.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX;
    const threshold = EvergreenConfig.swipeThreshold;

    if (
      Math.abs(delta) > threshold &&
      !state.settings.layout.rowExpanded[ex.id]
    ) {
      isAvailable(ex).then(available => {
        if (!available) return;
        adjust(ex, delta > 0 ? +1 : -1);
      });
    }
  });
}

// ---------------------------------------------------------
// Adjust Values
// ---------------------------------------------------------

async function adjust(ex, delta) {
  const { saveValue } = await loadStore();

  const current = state.values[ex.id] || 0;
  let value = Math.max(0, current + delta);

  state.values[ex.id] = value;

  saveValue(ex.id, value, todayString, () => {
    updateRowUI(ex);
    recomputeAndRenderSummary();
    renderHistory();
  });
}

// ---------------------------------------------------------
// Update Row UI
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

// ---------------------------------------------------------
// Wire Row Controls
// ---------------------------------------------------------

async function wireRowControls() {
  const { saveValue } = await loadStore();

  EXERCISES.forEach(ex => {
    const inputEl = document.getElementById(`input-${ex.id}`);
    const incBtn = document.getElementById(`inc-${ex.id}`);
    const decBtn = document.getElementById(`dec-${ex.id}`);
    const saveBtn = document.getElementById(`save-${ex.id}`);

    if (!inputEl || !incBtn || !decBtn || !saveBtn) return;

    inputEl.value = formatValue(ex, state.values[ex.id] || 0);

    const remainingEl = document.getElementById(`remaining-${ex.id}`);
    if (remainingEl) {
      remainingEl.textContent = remaining(ex, state.values[ex.id] || 0);
    }

    let dirty = false;

    function markDirty() {
      dirty = true;
      saveBtn.style.display = "inline-flex";
    }

    function clearDirty() {
      dirty = false;
      saveBtn.style.display = "none";
    }

    incBtn.addEventListener("click", () => {
      isAvailable(ex).then(available => {
        if (!available) return;
        adjust(ex, +1);
        clearDirty();
      });
    });

    decBtn.addEventListener("click", () => {
      isAvailable(ex).then(available => {
        if (!available) return;
        adjust(ex, -1);
        clearDirty();
      });
    });

    if (ex.type === "time") {
      inputEl.addEventListener("beforeinput", event => {
        if (!event.inputType || !event.inputType.startsWith("delete")) return;
        if (!selectionTouchesColon(inputEl)) return;
        event.preventDefault();
      });

      inputEl.addEventListener("keydown", event => {
        if (event.key !== "Backspace" && event.key !== "Delete") return;
        if (!isSingleCaretColonDelete(inputEl, event.key)) return;
        event.preventDefault();
      });
    }

    inputEl.addEventListener("input", () => {
      if (ex.type === "time") {
        inputEl.value = normalizeTimeInput(inputEl.value);
      }
      markDirty();
    });

    saveBtn.addEventListener("click", async () => {
      const available = await isAvailable(ex);
      if (!available) return;

      const parsed = parseValue(ex, inputEl.value);
      state.values[ex.id] = parsed;

      saveValue(ex.id, parsed, todayString, () => {
        updateRowUI(ex);
        recomputeAndRenderSummary();
        renderHistory();
        clearDirty();
      });
    });
  });
}
